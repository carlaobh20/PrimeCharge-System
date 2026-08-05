import { supabase } from '@/shared/lib/supabase';
import type { Favorito } from '../types';

export async function getFavorito(entidadeTipo: string, entidadeId: string, usuarioId: string) {
  const { data, error } = await supabase
    .from('favoritos')
    .select('*')
    .eq('entidade_tipo', entidadeTipo)
    .eq('entidade_id', entidadeId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return data as Favorito | null;
}

export async function addFavorito(params: {
  empresaId: string;
  entidadeTipo: string;
  entidadeId: string;
  usuarioId: string;
}) {
  const { empresaId, entidadeTipo, entidadeId, usuarioId } = params;
  const { data, error } = await supabase
    .from('favoritos')
    .insert({ empresa_id: empresaId, entidade_tipo: entidadeTipo, entidade_id: entidadeId, usuario_id: usuarioId })
    .select()
    .single();
  if (error) throw error;
  return data as Favorito;
}

export async function removeFavorito(id: string) {
  const { error } = await supabase.from('favoritos').delete().eq('id', id);
  if (error) throw error;
}
