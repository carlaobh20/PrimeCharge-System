import { supabase } from '@/shared/lib/supabase';
import type { ContaBancaria } from '../types';

export async function listContasBancarias() {
  const { data, error } = await supabase.from('contas_bancarias').select('*').order('nome');
  if (error) throw error;
  return data as ContaBancaria[];
}

export type ContaBancariaInput = Omit<ContaBancaria, 'id' | 'empresa_id' | 'criado_em' | 'atualizado_em'>;

export async function createContaBancaria(empresaId: string, payload: ContaBancariaInput) {
  const { data, error } = await supabase
    .from('contas_bancarias')
    .insert({ ...payload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;
  return data as ContaBancaria;
}

export async function updateContaBancaria(id: string, payload: Partial<ContaBancariaInput>) {
  const { data, error } = await supabase.from('contas_bancarias').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as ContaBancaria;
}
