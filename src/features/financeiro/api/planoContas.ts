import { supabase } from '@/shared/lib/supabase';
import type { PlanoConta } from '../types';

// Só leitura nesta fase (Épico 7, Sprint 1) — as linhas raiz são seedadas pela migration
// 0028, sem tela de criação/edição ainda (fora de escopo). Mesmo padrão de listCentrosCusto.
export async function listPlanoContas() {
  const { data, error } = await supabase.from('plano_contas').select('*').order('nome');
  if (error) throw error;
  return data as PlanoConta[];
}
