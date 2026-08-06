import { supabase, assertLinhaAfetada } from '@/shared/lib/supabase';
import type { Contrato, ContratoComRelacoes, ContratoStatus } from '../types';

const SELECT_COM_RELACOES = '*, veiculo:veiculos(id, placa, status), motorista:motoristas(id, nome_completo, status)';

export async function listContratos(filters?: {
  status?: ContratoStatus | 'todos';
  busca?: string;
  veiculoId?: string;
  motoristaId?: string;
}) {
  let query = supabase.from('contratos').select(SELECT_COM_RELACOES).order('criado_em', { ascending: false });

  if (filters?.status && filters.status !== 'todos') {
    query = query.eq('status', filters.status);
  }
  // Achado da auditoria da Missão 5 (Fase 1, performance): useVehicleIntelligence/
  // useDriverIntelligence buscavam TODOS os contratos da empresa e filtravam em memória por
  // veiculo_id/motorista_id — a cada mil contratos, isso é um fetch cada vez mais desperdiçado
  // para um resultado de 0-3 linhas. Filtro server-side, mesmo padrão já usado por veiculoId em
  // listLancamentos.
  if (filters?.veiculoId) query = query.eq('veiculo_id', filters.veiculoId);
  if (filters?.motoristaId) query = query.eq('motorista_id', filters.motoristaId);

  const { data, error } = await query;
  if (error) throw error;

  let contratos = data as unknown as ContratoComRelacoes[];

  // Busca por placa/motorista é feita client-side depois do join — supabase-js não permite
  // `.or()` sobre colunas de tabela relacionada na mesma query sem uma view/rpc dedicada, e
  // criar uma só para isso seria abstração cedo demais para o volume de contratos esperado
  // nesta fase (mesmo racional de "regra dos 3" — DEC-010).
  if (filters?.busca) {
    const termo = filters.busca.trim().toLowerCase();
    if (termo) {
      contratos = contratos.filter(
        (c) => c.veiculo?.placa?.toLowerCase().includes(termo) || c.motorista?.nome_completo?.toLowerCase().includes(termo)
      );
    }
  }

  return contratos;
}

export async function getContrato(id: string) {
  const { data, error } = await supabase.from('contratos').select(SELECT_COM_RELACOES).eq('id', id).single();
  if (error) throw error;
  return data as unknown as ContratoComRelacoes;
}

export type ContratoInput = Omit<
  Contrato,
  'id' | 'empresa_id' | 'criado_em' | 'atualizado_em' | 'status' | 'data_fim_real' | 'km_final' | 'carga_final_pct'
>;

export async function createContrato(empresaId: string, payload: ContratoInput) {
  const { data, error } = await supabase
    .from('contratos')
    .insert({ ...payload, empresa_id: empresaId, status: 'rascunho' })
    .select()
    .single();
  if (error) throw error;
  return data as Contrato;
}

export async function updateContrato(id: string, payload: Partial<ContratoInput>) {
  const { data, error } = await supabase.from('contratos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as Contrato;
}

// Validação da transição (state machine) e da permissão por ação acontecem no banco
// (fn_validar_transicao_contrato, migration 0005) — esta função só dispara o UPDATE; se a
// transição ou a permissão forem inválidas, o Postgres rejeita e o erro sobe pelo `error`
// do supabase-js, tratado pela UI como qualquer outro erro de mutation.
export async function updateContratoStatus(id: string, status: ContratoStatus) {
  const { data, error } = await supabase.from('contratos').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data as Contrato;
}

export async function renovarContrato(id: string, novaDataFimPrevista: string) {
  // Renovação é duas transições em sequência (ativo → renovacao → ativo), cada uma validada
  // pelo mesmo trigger de state machine — não um caminho especial que pula a validação.
  const { error: errRenovacao } = await supabase.from('contratos').update({ status: 'renovacao' }).eq('id', id);
  if (errRenovacao) throw errRenovacao;

  const { data, error } = await supabase
    .from('contratos')
    .update({ status: 'ativo', data_fim_prevista: novaDataFimPrevista })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Contrato;
}

export async function deleteContrato(id: string) {
  const { data, error } = await supabase.from('contratos').delete().eq('id', id).select('id');
  if (error) throw error;
  assertLinhaAfetada(data);
}

// Achado crítico #2 da auditoria da Missão 2 (2026-08-06): "Encerrar contrato" só mudava o
// status — km_final/carga_final_pct nunca eram capturados pela UI, mesmo já existindo na
// tabela desde a Sprint 7 e sendo consumidos pelo alerta "devolvido com carga baixa"
// (contracts/intelligence/alerts.ts). Uma única UPDATE: o trigger de state machine
// (fn_validar_transicao_contrato) valida a transição normalmente, e data_fim_real é
// preenchida automaticamente pelo próprio trigger quando fica nula.
export async function encerrarContrato(id: string, payload: { kmFinal: number; cargaFinalPct: number }) {
  const { data, error } = await supabase
    .from('contratos')
    .update({ status: 'encerrado', km_final: payload.kmFinal, carga_final_pct: payload.cargaFinalPct })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Contrato;
}

// Fecha um achado real da auditoria de jornada da Missão 4: km_inicial/carga_inicial_pct só
// eram capturados na criação do contrato ('rascunho'), não no momento real da entrega física
// ('assinado' → 'ativo') — ver AtivarContratoDialog. Mesmo padrão de encerrarContrato: um
// único UPDATE, o trigger de state machine (fn_validar_transicao_contrato) valida a transição.
export async function ativarContrato(id: string, payload: { kmInicial: number; cargaInicialPct: number }) {
  const { data, error } = await supabase
    .from('contratos')
    .update({ status: 'ativo', km_inicial: payload.kmInicial, carga_inicial_pct: payload.cargaInicialPct })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Contrato;
}

// Variante em lote — mesmo padrão de listArquivosPorEntidades (shared/capabilities), usada
// pelo Command Center para coletar a inteligência de todos os contratos sem N+1.
export async function listContratosPorEmpresa() {
  const { data, error } = await supabase.from('contratos').select(SELECT_COM_RELACOES);
  if (error) throw error;
  return data as unknown as ContratoComRelacoes[];
}
