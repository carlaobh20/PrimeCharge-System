import { supabase } from '@/shared/lib/supabase';
import type { AcaoCandidata, AcaoOperacional, AcaoOperacionalComRelacoes, AcaoStatus } from '../types';

const SELECT_COM_RELACOES = '*, responsavel:usuarios(id, nome_completo)';

export type AcaoFilters = {
  status?: AcaoStatus | 'todos';
  responsavelId?: string;
  entidadeTipo?: string;
  entidadeId?: string;
};

export async function listAcoes(filters?: AcaoFilters) {
  let query = supabase
    .from('acoes_operacionais')
    .select(SELECT_COM_RELACOES)
    .order('prazo', { ascending: true, nullsFirst: false })
    .order('criado_em', { ascending: false });

  if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status);
  if (filters?.responsavelId) query = query.eq('responsavel_id', filters.responsavelId);
  if (filters?.entidadeTipo) query = query.eq('entidade_tipo', filters.entidadeTipo);
  if (filters?.entidadeId) query = query.eq('entidade_id', filters.entidadeId);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as AcaoOperacionalComRelacoes[];
}

export async function getAcao(id: string) {
  const { data, error } = await supabase.from('acoes_operacionais').select(SELECT_COM_RELACOES).eq('id', id).single();
  if (error) throw error;
  return data as unknown as AcaoOperacionalComRelacoes;
}

// Variante em lote sem filtro — mesmo padrão de listLancamentosPorEmpresa (DEC-048), usada
// pelo Command Center para mostrar o resumo de Ações Operacionais (DEC-055).
export async function listAcoesPorEmpresa() {
  const { data, error } = await supabase.from('acoes_operacionais').select(SELECT_COM_RELACOES);
  if (error) throw error;
  return data as unknown as AcaoOperacionalComRelacoes[];
}

export type AcaoInput = {
  titulo: string;
  descricao?: string | null;
  tipo?: string;
  prioridade?: AcaoOperacional['prioridade'];
  prazo?: string | null;
  responsavel_id?: string | null;
  entidade_tipo?: string | null;
  entidade_id?: string | null;
};

// Criação manual: origem/gerado_por sempre 'manual'/null — geração real acontece só via
// sincronizarAcoesGeradas (nunca pelo formulário do usuário).
export async function createAcao(empresaId: string, payload: AcaoInput) {
  const { data, error } = await supabase
    .from('acoes_operacionais')
    .insert({ ...payload, empresa_id: empresaId, origem: 'manual', gerado_por: null })
    .select()
    .single();
  if (error) throw error;
  return data as AcaoOperacional;
}

export async function updateAcao(id: string, payload: Partial<AcaoInput>) {
  const { data, error } = await supabase.from('acoes_operacionais').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as AcaoOperacional;
}

// Validação de transição e permissão acontecem no banco (fn_validar_transicao_acao,
// migration 0007) — mesmo padrão de updateContratoStatus/updateLancamentoStatus.
export async function updateAcaoStatus(id: string, status: AcaoStatus) {
  const { data, error } = await supabase.from('acoes_operacionais').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data as AcaoOperacional;
}

// Sincronização sob demanda (DEC-055) — sem pg_cron. Compara as candidatas produzidas pelos
// geradores (intelligence/geradores/) contra as ações geradas já abertas: cria as que faltam,
// fecha (status='concluida') as que não têm mais candidata correspondente (condição
// resolvida — ex. CNH renovada). Nunca mexe em ações manuais (gerado_por nulo).
export async function sincronizarAcoesGeradas(empresaId: string, candidatas: AcaoCandidata[]) {
  const { data: abertas, error: erroAbertas } = await supabase
    .from('acoes_operacionais')
    .select('id, gerado_por, entidade_tipo, entidade_id')
    .eq('empresa_id', empresaId)
    .not('gerado_por', 'is', null)
    .in('status', ['pendente', 'em_andamento']);
  if (erroAbertas) throw erroAbertas;

  const chave = (g: string | null, t: string | null, i: string | null) => `${g}::${t}::${i}`;
  const abertasPorChave = new Map((abertas ?? []).map((a) => [chave(a.gerado_por, a.entidade_tipo, a.entidade_id), a]));
  const candidatasPorChave = new Map(candidatas.map((c) => [chave(c.gerado_por, c.entidade_tipo, c.entidade_id), c]));

  const novas = candidatas.filter((c) => !abertasPorChave.has(chave(c.gerado_por, c.entidade_tipo, c.entidade_id)));
  const resolvidasIds = (abertas ?? [])
    .filter((a) => !candidatasPorChave.has(chave(a.gerado_por, a.entidade_tipo, a.entidade_id)))
    .map((a) => a.id);

  let criadas = 0;
  if (novas.length > 0) {
    const { error, data } = await supabase
      .from('acoes_operacionais')
      .insert(
        novas.map((c) => ({
          empresa_id: empresaId,
          titulo: c.titulo,
          descricao: c.descricao ?? null,
          tipo: c.tipo,
          prioridade: c.prioridade,
          prazo: c.prazo,
          entidade_tipo: c.entidade_tipo,
          entidade_id: c.entidade_id,
          gerado_por: c.gerado_por,
          origem: 'sistema',
        }))
      )
      .select('id');
    // 23505 = índice único parcial (uq_acoes_geradas_abertas) — outra sincronização
    // concorrente já criou a mesma ação entre a leitura e o insert; não é erro real.
    if (error && (error as { code?: string }).code !== '23505') throw error;
    criadas = data?.length ?? 0;
  }

  let fechadas = 0;
  if (resolvidasIds.length > 0) {
    const { error, count } = await supabase
      .from('acoes_operacionais')
      .update({ status: 'concluida' }, { count: 'exact' })
      .in('id', resolvidasIds);
    if (error) throw error;
    fechadas = count ?? 0;
  }

  return { criadas, fechadas };
}
