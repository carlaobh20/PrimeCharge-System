import { supabase } from '@/shared/lib/supabase';
import type { Tag } from '../types';

export async function listTags(entidadeTipo: string, entidadeId: string) {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('entidade_tipo', entidadeTipo)
    .eq('entidade_id', entidadeId)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return data as Tag[];
}

// Variante em lote — ver nota em capabilities/api/arquivos.ts (listArquivosPorEntidades).
export async function listTagsPorEntidades(entidadeTipo: string, entidadeIds: string[]) {
  if (entidadeIds.length === 0) return [];
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('entidade_tipo', entidadeTipo)
    .in('entidade_id', entidadeIds);
  if (error) throw error;
  return data as Tag[];
}

export async function addTag(params: {
  empresaId: string;
  entidadeTipo: string;
  entidadeId: string;
  tag: string;
  usuarioId?: string;
}) {
  const { empresaId, entidadeTipo, entidadeId, tag, usuarioId } = params;
  const { data, error } = await supabase
    .from('tags')
    .insert({
      empresa_id: empresaId,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      tag: tag.trim().toLowerCase(),
      usuario_id: usuarioId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Tag;
}

export async function removeTag(id: string) {
  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw error;
}
