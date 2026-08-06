import { supabase } from '@/shared/lib/supabase';
import type { Manutencao } from '../types';

export type ManutencaoInput = Omit<Manutencao, 'id' | 'empresa_id' | 'criado_por' | 'criado_em' | 'atualizado_em'>;

export async function listManutencoesPorVeiculo(veiculoId: string) {
  const { data, error } = await supabase
    .from('manutencoes')
    .select('*')
    .eq('veiculo_id', veiculoId)
    .order('data_execucao', { ascending: false });
  if (error) throw error;
  return data as Manutencao[];
}

export async function createManutencao(empresaId: string, payload: ManutencaoInput) {
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('manutencoes')
    .insert({ ...payload, empresa_id: empresaId, criado_por: authData.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Manutencao;
}

export async function deleteManutencao(id: string) {
  const { error } = await supabase.from('manutencoes').delete().eq('id', id);
  if (error) throw error;
}
