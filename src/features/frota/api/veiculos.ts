import { supabase } from '@/shared/lib/supabase';
import type { Veiculo, VeiculoComRelacoes, VeiculoStatus } from '../types';

const SELECT_COM_RELACOES = '*, marca:marcas(*), modelo:modelos(*)';

export async function listVeiculos(filters?: { status?: VeiculoStatus | 'todos'; busca?: string }) {
  let query = supabase.from('veiculos').select(SELECT_COM_RELACOES).order('criado_em', { ascending: false });

  if (filters?.status && filters.status !== 'todos') {
    query = query.eq('status', filters.status);
  }
  if (filters?.busca) {
    const termo = filters.busca.trim();
    if (termo) {
      query = query.or(`placa.ilike.%${termo}%,chassi.ilike.%${termo}%,renavam.ilike.%${termo}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as VeiculoComRelacoes[];
}

export async function getVeiculo(id: string) {
  const { data, error } = await supabase.from('veiculos').select(SELECT_COM_RELACOES).eq('id', id).single();
  if (error) throw error;
  return data as unknown as VeiculoComRelacoes;
}

export type VeiculoInput = Omit<Veiculo, 'id' | 'empresa_id' | 'criado_em' | 'atualizado_em'>;

export async function createVeiculo(empresaId: string, payload: VeiculoInput) {
  const { data, error } = await supabase
    .from('veiculos')
    .insert({ ...payload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;
  return data as Veiculo;
}

export async function updateVeiculo(id: string, payload: Partial<VeiculoInput>) {
  const { data, error } = await supabase.from('veiculos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as Veiculo;
}

export async function updateVeiculoStatus(id: string, status: VeiculoStatus) {
  const { data, error } = await supabase.from('veiculos').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data as Veiculo;
}

export async function deleteVeiculo(id: string) {
  const { error } = await supabase.from('veiculos').delete().eq('id', id);
  if (error) throw error;
}
