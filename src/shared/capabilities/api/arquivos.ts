import { supabase } from '@/shared/lib/supabase';
import type { Arquivo } from '../types';

// caminho_storage é salvo como "{bucket}/{path}" — autodescritivo, sem precisar de coluna extra.

export async function listArquivos(entidadeTipo: string, entidadeId: string, categoria?: string) {
  let query = supabase
    .from('arquivos')
    .select('*')
    .eq('entidade_tipo', entidadeTipo)
    .eq('entidade_id', entidadeId)
    .order('criado_em', { ascending: false });
  if (categoria) query = query.eq('categoria', categoria);

  const { data, error } = await query;
  if (error) throw error;
  return data as Arquivo[];
}

export async function uploadArquivo(params: {
  bucket: string;
  empresaId: string;
  entidadeTipo: string;
  entidadeId: string;
  categoria?: string;
  usuarioId?: string;
  file: File;
}) {
  const { bucket, empresaId, entidadeTipo, entidadeId, categoria, usuarioId, file } = params;
  const path = `${empresaId}/${entidadeId}/${crypto.randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('arquivos')
    .insert({
      empresa_id: empresaId,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      categoria: categoria ?? null,
      nome_arquivo: file.name,
      caminho_storage: `${bucket}/${path}`,
      tipo_mime: file.type || null,
      tamanho_bytes: file.size,
      usuario_id: usuarioId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Arquivo;
}

export async function getArquivoUrl(caminhoStorage: string) {
  const [bucket, ...rest] = caminhoStorage.split('/');
  const path = rest.join('/');
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteArquivo(arquivo: Arquivo) {
  const [bucket, ...rest] = arquivo.caminho_storage.split('/');
  const path = rest.join('/');
  await supabase.storage.from(bucket).remove([path]);
  const { error } = await supabase.from('arquivos').delete().eq('id', arquivo.id);
  if (error) throw error;
}
