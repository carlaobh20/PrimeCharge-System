import { supabase } from '@/shared/lib/supabase';
import type { PoliticasEmpresa, PoliticasEmpresaInput } from '../types';

// Singleton por empresa (unique em empresa_id, ver migration) — maybeSingle() porque a linha
// só passa a existir depois que o proprietário salva pela primeira vez; "nenhuma política
// definida ainda" é um estado real, não um erro.
export async function getPoliticasDaEmpresa(): Promise<PoliticasEmpresa | null> {
  const { data, error } = await supabase.from('politicas_empresa').select('*').maybeSingle();
  if (error) throw error;
  return data as PoliticasEmpresa | null;
}

export async function salvarPoliticas(
  empresaId: string,
  usuarioId: string,
  payload: PoliticasEmpresaInput
): Promise<PoliticasEmpresa> {
  const { data, error } = await supabase
    .from('politicas_empresa')
    .upsert({ empresa_id: empresaId, atualizado_por: usuarioId, ...payload }, { onConflict: 'empresa_id' })
    .select()
    .single();
  if (error) throw error;
  return data as PoliticasEmpresa;
}
