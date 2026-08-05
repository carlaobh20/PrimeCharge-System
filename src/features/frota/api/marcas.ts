import { supabase } from '@/shared/lib/supabase';
import type { Marca } from '../types';

export async function listMarcas() {
  const { data, error } = await supabase.from('marcas').select('*').order('nome');
  if (error) throw error;
  return data as Marca[];
}

export async function createMarca(nome: string) {
  const { data, error } = await supabase.from('marcas').insert({ nome: nome.trim() }).select().single();
  if (error) throw error;
  return data as Marca;
}
