import { supabase } from '@/shared/lib/supabase';

// Documentos do motorista — arquivos do próprio motorista/contrato/veículo (RLS migration 0040;
// o Storage já foi restringido por vínculo na 0039). Leitura via signed URL de curta duração.

export type MeuDocumento = {
  id: string;
  entidade_tipo: string;
  categoria: string | null;
  nome_arquivo: string;
  caminho_storage: string;
  data_validade: string | null;
  criado_em: string;
};

export async function listMeusDocumentos(): Promise<MeuDocumento[]> {
  const { data, error } = await supabase
    .from('arquivos')
    .select('id, entidade_tipo, categoria, nome_arquivo, caminho_storage, data_validade, criado_em')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MeuDocumento[];
}

// caminho_storage é "{bucket}/{path}" — gera uma URL assinada de 1h (mesmo padrão do
// ArquivosPanel administrativo). A RLS do Storage (0039) só devolve a URL se o arquivo for
// do contexto do motorista.
export async function assinarUrlDocumento(caminhoStorage: string): Promise<string | null> {
  const barra = caminhoStorage.indexOf('/');
  if (barra < 0) return null;
  const bucket = caminhoStorage.slice(0, barra);
  const path = caminhoStorage.slice(barra + 1);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}
