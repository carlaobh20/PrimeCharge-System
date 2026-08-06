import { supabase } from '@/shared/lib/supabase';
import type { Pagamento, PagamentoComRelacoes, PagamentoStatus } from '../types';

const SELECT_COM_RELACOES =
  '*, lancamento:lancamentos(id, tipo, descricao, contrato_id, veiculo_id, motorista_id), conta_bancaria:contas_bancarias(id, nome)';

export async function listPagamentos(filters?: { status?: PagamentoStatus | 'todos'; lancamentoId?: string }) {
  let query = supabase.from('pagamentos').select(SELECT_COM_RELACOES).order('data_prevista', { ascending: false });

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
export async function listPagamentosPendentesPorEmpresa() {
  const { data, error } = await supabase.from('pagamentos').select(SELECT_COM_RELACOES).eq('status', 'pendente');
  if (error) throw error;
  return data as unknown as PagamentoComRelacoes[];
}

// Todos os pagamentos da empresa, qualquer status — usado pelo Driver Score (Missão 3) para
// calcular pontualidade real (proporção pago no prazo), sinal que não existia antes da
// Missão 2 criar a tela de Pagamentos. Mesmo padrão de listLancamentosPorEmpresa.
export async function listPagamentosPorEmpresa() {
  const { data, error } = await supabase.from('pagamentos').select(SELECT_COM_RELACOES);
  if (error) throw error;
  return data as unknown as PagamentoComRelacoes[];
}
