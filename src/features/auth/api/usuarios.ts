import { supabase } from '@/shared/lib/supabase';
import type { Usuario } from '@/shared/types/database';

// Lista os colegas da própria empresa — RLS ("usuarios: ve colegas da empresa", 0001) já
// isola por empresa_id, então esta query não precisa (e não deve) filtrar manualmente.
export async function listUsuariosPorEmpresa() {
  const { data, error } = await supabase.from('usuarios').select('*').order('criado_em', { ascending: true });
  if (error) throw error;
  return data as Usuario[];
}
