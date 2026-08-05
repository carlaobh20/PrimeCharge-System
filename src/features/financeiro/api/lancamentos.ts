import { supabase } from '@/shared/lib/supabase';
import type { Lancamento, LancamentoComRelacoes, LancamentoStatus, LancamentoTipo } from '../types';

const SELECT_COM_RELACOES =
  '*, centro_custo:centros_custo(id, nome), contrato:contratos(id, veiculo_id, motorista_id), veiculo:veiculos(id, placa), motorista:motoristas(id, nome_completo)';

export type LancamentoFilters = {
  tipo?: LancamentoTipo | 'todos';
  status?: LancamentoStatus | 'todos';
  contratoId?: string;
  veiculoId?: string;
  motoristaId?: string;
};

export async function listLancamentos(filters?: LancamentoFilters) {
  let query = supabase.from('lancamentos').select(SELECT_COM_RELACOES).order('data_prevista', { ascending: false });

  if (filters?.tipo && filters.tipo !== 'todos') query = query.eq('tipo', filters.tipo);
  if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status);
  if (filters?.contratoId) query = query.eq('contrato_id', filters.contratoId);
  if (filters?.veiculoId) query = query.eq('veiculo_id', filters.veiculoId);
  if (filters?.motoristaId) query = query.eq('motorista_id', filters.motoristaId);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as LancamentoComRelacoes[];
}

export async function getLancamento(id: string) {
  const { data, error } = await supabase.from('lancamentos').select(SELECT_COM_RELACOES).eq('id', id).single();
  if (error) throw error;
  return data as unknown as LancamentoComRelacoes;
}

export type LancamentoInput = Omit<
  Lancamento,
  'id' | 'empresa_id' | 'criado_em' | 'atualizado_em' | 'status' | 'data_confirmacao' | 'criado_via'
>;

export async function createLancamento(empresaId: string, payload: LancamentoInput) {
  const { data, error } = await supabase
    .from('lancamentos')
    .insert({ ...payload, empresa_id: empresaId, status: 'prevista', criado_via: 'manual' })
    .select()
    .single();
  if (error) throw error;
  return data as Lancamento;
}

export async function updateLancamento(id: string, payload: Partial<LancamentoInput>) {
  const { data, error } = await supabase.from('lancamentos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as Lancamento;
}

// Validação de transição e permissão acontecem no banco (fn_validar_transicao_lancamento,
// migration 0006) — mesmo padrão de updateContratoStatus.
export async function updateLancamentoStatus(id: string, status: LancamentoStatus) {
  const { data, error } = await supabase.from('lancamentos').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data as Lancamento;
}

export async function deleteLancamento(id: string) {
  const { error } = await supabase.from('lancamentos').delete().eq('id', id);
  if (error) throw error;
}

// Variante em lote, mesmo padrão de listContratosPorEmpresa — usada pela Financial
// Intelligence (categoria financeira de Veículo/Motorista/Contrato, DEC-047/DEC-048).
export async function listLancamentosPorEmpresa() {
  const { data, error } = await supabase.from('lancamentos').select(SELECT_COM_RELACOES);
  if (error) throw error;
  return data as unknown as LancamentoComRelacoes[];
}
