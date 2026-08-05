import { supabase } from '@/shared/lib/supabase';
import type { Comentario } from '../types';

export async function listComentarios(entidadeTipo: string, entidadeId: string) {
  const { data, error } = await supabase
    .from('comentarios')
    .select('*')
    .eq('entidade_tipo', entidadeTipo)
    .eq('entidade_id', entidadeId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as Comentario[];
}

// Variante em lote — ver nota em capabilities/api/arquivos.ts (listArquivosPorEntidades).
export async function listComentariosPorEntidades(entidadeTipo: string, entidadeIds: string[]) {
  if (entidadeIds.length === 0) return [];
  const { data, error } = await supabase
    .from('comentarios')
    .select('*')
    .eq('entidade_tipo', entidadeTipo)
    .in('entidade_id', entidadeIds);
  if (error) throw error;
  return data as Comentario[];
}

export async function createComentario(params: {
  empresaId: string;
  entidadeTipo: string;
  entidadeId: string;
  texto: string;
  usuarioId: string;
}) {
  const { empresaId, entidadeTipo, entidadeId, texto, usuarioId } = params;
  const { data, error } = await supabase
    .from('comentarios')
    .insert({ empresa_id: empresaId, entidade_tipo: entidadeTipo, entidade_id: entidadeId, texto, usuario_id: usuarioId })
    .select()
    .single();
  if (error) throw error;
  return data as Comentario;
}

export async function updateComentario(id: string, texto: string) {
  const { data, error } = await supabase.from('comentarios').update({ texto }).eq('id', id).select().single();
  if (error) throw error;
  return data as Comentario;
}

export async function deleteComentario(id: string) {
  const { error } = await supabase.from('comentarios').delete().eq('id', id);
  if (error) throw error;
}
