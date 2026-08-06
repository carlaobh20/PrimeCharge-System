import { supabase } from '@/shared/lib/supabase';
import type { Multa, MultaComRelacoes, MultaStatus } from '../types';

const SELECT_COM_RELACOES = '*, veiculo:veiculos(id, placa), motorista:motoristas(id, nome_completo)';

export type MultaInput = Omit<Multa, 'id' | 'empresa_id' | 'criado_por' | 'criado_em' | 'atualizado_em' | 'status'>;

export async function listMultasPorVeiculo(veiculoId: string) {
  const { data, error } = await supabase
    .from('multas')
    .select('*')
    .eq('veiculo_id', veiculoId)
    .order('data_infracao', { ascending: false });
  if (error) throw error;
  return data as Multa[];
}

// Usada pela aba "Eventos" do Motorista (leitura — criar uma multa exige escolher o veículo,
// então a criação continua só no Cockpit do Veículo, ver MultasPanel).
export async function listMultasPorMotorista(motoristaId: string) {
  const { data, error } = await supabase
    .from('multas')
    .select(SELECT_COM_RELACOES)
    .eq('motorista_id', motoristaId)
    .order('data_infracao', { ascending: false });
  if (error) throw error;
  return data as unknown as MultaComRelacoes[];
}

// Variante em lote — mesmo padrão de listContratosPorEmpresa/listPagamentosPorEmpresa, usada
// pelos geradores de Ações Operacionais (multa com vencimento próximo) sem N+1.
export async function listMultasPorEmpresa() {
  const { data, error } = await supabase.from('multas').select(SELECT_COM_RELACOES);
  if (error) throw error;
  return data as unknown as MultaComRelacoes[];
}

export async function createMulta(empresaId: string, payload: MultaInput) {
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('multas')
    .insert({ ...payload, empresa_id: empresaId, criado_por: authData.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Multa;
}

export async function updateMultaStatus(id: string, status: MultaStatus) {
  const { data, error } = await supabase.from('multas').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data as Multa;
}

export async function deleteMulta(id: string) {
  const { error } = await supabase.from('multas').delete().eq('id', id);
  if (error) throw error;
}
