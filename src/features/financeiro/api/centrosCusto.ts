import { supabase } from '@/shared/lib/supabase';
import type { CentroCusto } from '../types';

export async function listCentrosCusto() {
  const { data, error } = await supabase.from('centros_custo').select('*').order('nome');
  if (error) throw error;
  return data as CentroCusto[];
}

export type CentroCustoInput = Omit<CentroCusto, 'id' | 'empresa_id' | 'criado_em' | 'atualizado_em'>;

export async function createCentroCusto(empresaId: string, payload: CentroCustoInput) {
  const { data, error } = await supabase
    .from('centros_custo')
    .insert({ ...payload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;
  return data as CentroCusto;
}

export async function updateCentroCusto(id: string, payload: Partial<CentroCustoInput>) {
  const { data, error } = await supabase.from('centros_custo').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as CentroCusto;
}
