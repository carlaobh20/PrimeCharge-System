import { supabase } from '@/shared/lib/supabase';
import type { Modelo } from '../types';

export async function listModelosPorMarca(marcaId: string) {
  const { data, error } = await supabase.from('modelos').select('*').eq('marca_id', marcaId).order('nome');
  if (error) throw error;
  return data as Modelo[];
}

export async function createModelo(marcaId: string, nome: string) {
  const { data, error } = await supabase
    .from('modelos')
    .insert({ marca_id: marcaId, nome: nome.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Modelo;
}
