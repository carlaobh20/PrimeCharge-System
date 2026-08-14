import { supabase } from '@/shared/lib/supabase';
import type { Pagamento, PagamentoComRelacoes, PagamentoStatus } from '../types';

const SELECT_COM_RELACOES =
  '*, lancamento:lancamentos(id, tipo, descricao, contrato_id, veiculo_id, motorista_id), conta_bancaria:contas_bancarias(id, nome)';

// Mesmo SELECT, mas com `!inner` no relacionamento — necessário só quando filtramos por uma
// coluna de `lancamentos` (veiculo_id/motorista_id/contrato_id), porque o PostgREST só aceita
// `.eq('lancamento.coluna', ...)` sobre um embed marcado `!inner` (embed normal — left join —
// ignora o filtro). Mantido separado do SELECT_COM_RELACOES "solto" para não forçar inner join
// (que excluiria pagamento sem lançamento, hoje impossível pela FK `not null`, mas não vale
// arriscar mudar o comportamento das consultas sem filtro).
const SELECT_COM_RELACOES_INNER =
  '*, lancamento:lancamentos!inner(id, tipo, descricao, contrato_id, veiculo_id, motorista_id), conta_bancaria:contas_bancarias(id, nome)';

type FiltroEntidade = { veiculoId?: string; motoristaId?: string; contratoId?: string };

// Achado da auditoria do Épico 1 (Operação Perfeita, achado #2): esta tela é o único lugar da
// aplicação onde "pagar" acontece de verdade, mas não existia fila de atraso — ordenação era
// mais-recente-primeiro (o oposto do que uma tela de cobrança precisa) e não havia como filtrar
// só o que está vencido. `data_prevista` ascendente põe o mais atrasado no topo por padrão;
// PagamentosPage soma o filtro "Atrasados" (pendente + vencido) em cima disto, em memória.
export async function listPagamentos(filters?: { status?: PagamentoStatus | 'todos'; lancamentoId?: string }) {
  let query = supabase.from('pagamentos').select(SELECT_COM_RELACOES).order('data_prevista', { ascending: true });

  if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status);
  if (filters?.lancamentoId) query = query.eq('lancamento_id', filters.lancamentoId);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as PagamentoComRelacoes[];
}

export type PagamentoInput = Omit<Pagamento, 'id' | 'empresa_id' | 'criado_em' | 'atualizado_em' | 'status' | 'data_pagamento'>;

export async function createPagamento(empresaId: string, payload: PagamentoInput) {
  const { data, error } = await supabase
    .from('pagamentos')
    .insert({ ...payload, empresa_id: empresaId, status: 'pendente' })
    .select()
    .single();
  if (error) throw error;
  return data as Pagamento;
}

// Validação de transição e permissão no banco (fn_validar_transicao_pagamento) — "pago"
// também propaga para o lançamento vinculado (fn_propagar_status_pagamento, migration 0006).
export async function updatePagamentoStatus(id: string, status: PagamentoStatus) {
  const { data, error } = await supabase.from('pagamentos').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data as Pagamento;
}

// Usada pela Financial Intelligence para calcular inadimplência/atraso — sem "atrasado"
// persistido (ver types.ts), o filtro de atraso é sempre feito em memória sobre isto.
//
// Achado da auditoria da Missão 5 (Fase 1, performance): useVehicleIntelligence/
// useDriverIntelligence/useContractIntelligence chamavam esta função sem filtro (todos os
// pagamentos pendentes da empresa) e filtravam em memória por veiculo_id/motorista_id/
// contrato_id — a cada mil veículos com anos de histórico financeiro, isso é buscar a tabela
// inteira pra usar 1-3 linhas. `filtro` opcional preserva o comportamento antigo (Command
// Center continua chamando sem filtro, precisa mesmo de tudo) e usa `!inner` só quando um
// filtro é passado, exatamente pela razão documentada em SELECT_COM_RELACOES_INNER acima.
export async function listPagamentosPendentesPorEmpresa(filtro?: FiltroEntidade) {
  const temFiltro = !!(filtro?.veiculoId || filtro?.motoristaId || filtro?.contratoId);
  let query = supabase
    .from('pagamentos')
    .select(temFiltro ? SELECT_COM_RELACOES_INNER : SELECT_COM_RELACOES)
    .eq('status', 'pendente');

  if (filtro?.veiculoId) query = query.eq('lancamento.veiculo_id', filtro.veiculoId);
  if (filtro?.motoristaId) query = query.eq('lancamento.motorista_id', filtro.motoristaId);
  if (filtro?.contratoId) query = query.eq('lancamento.contrato_id', filtro.contratoId);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as PagamentoComRelacoes[];
}

// Todos os pagamentos da empresa, qualquer status — usado pelo Driver Score (Missão 3) para
// calcular pontualidade real (proporção pago no prazo), sinal que não existia antes da
// Missão 2 criar a tela de Pagamentos. Mesmo padrão de listLancamentosPorEmpresa. `filtro`
// opcional, mesmo motivo/mesmo padrão de listPagamentosPendentesPorEmpresa acima.
export async function listPagamentosPorEmpresa(filtro?: FiltroEntidade) {
  const temFiltro = !!(filtro?.veiculoId || filtro?.motoristaId || filtro?.contratoId);
  let query = supabase.from('pagamentos').select(temFiltro ? SELECT_COM_RELACOES_INNER : SELECT_COM_RELACOES);

  if (filtro?.veiculoId) query = query.eq('lancamento.veiculo_id', filtro.veiculoId);
  if (filtro?.motoristaId) query = query.eq('lancamento.motorista_id', filtro.motoristaId);
  if (filtro?.contratoId) query = query.eq('lancamento.contrato_id', filtro.contratoId);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as PagamentoComRelacoes[];
}
