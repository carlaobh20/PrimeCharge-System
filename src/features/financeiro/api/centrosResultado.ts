import { supabase } from '@/shared/lib/supabase';
import type { CentroResultado } from '../types';

// Só leitura nesta fase (Épico 7, Sprint 1) — a linha "Locação" é seedada pela migration
// 0028, sem tela de criação/edição ainda (fora de escopo). Mesmo padrão de listCentrosCusto.
export async function listCentrosResultado() {
  const { data, error } = await supabase.from('centros_resultado').select('*').order('nome');
  if (error) throw error;
  return data as CentroResultado[];
}
