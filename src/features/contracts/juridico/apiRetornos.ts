// RETORNOS DO ADVOGADO (Fase 7) — arquivamento e listagem dos arquivos efetivamente recebidos.
// REUSO TOTAL de estrutura existente (auditado antes de escrever — regra 24 da missão):
// - `arquivos` + Storage `contratos-arquivos` com entidade_tipo='contrato_template':
//   RLS já é staff-only (0036/0041) e o Storage só libera motorista para pasta do PRÓPRIO
//   contrato (0039) — o caminho de template nunca casa ⇒ motorista NÃO acessa retorno/protocolo.
// - status do retorno é DERIVADO (arquivo × fotografias 0046) — nenhum enum novo.
// - decisões (cláusula removida, pendência confirmada, migração de contrato) vão em
//   juridico_parametros via useSaveParametro — nada novo no banco. ZERO migration nesta fase.
import { supabase } from '@/shared/lib/supabase';
import { uploadArquivo } from '@/shared/capabilities/api/arquivos';

export const CATEGORIA_RETORNO = 'retorno_advogado';
export const CATEGORIA_PROTOCOLO = 'protocolo_retorno';

export type ArquivoRetorno = {
  id: string;
  entidade_id: string; // template_id
  categoria: string | null;
  nome_arquivo: string;
  caminho_storage: string;
  tipo_mime: string | null;
  tamanho_bytes: number | null;
  usuario_id: string | null;
  criado_em: string;
};

/** Todos os retornos (e protocolos) arquivados de templates da empresa — staff-only pela RLS. */
export async function listRetornosAdvogado(): Promise<ArquivoRetorno[]> {
  const { data, error } = await supabase
    .from('arquivos')
    .select('id, entidade_id, categoria, nome_arquivo, caminho_storage, tipo_mime, tamanho_bytes, usuario_id, criado_em')
    .eq('entidade_tipo', 'contrato_template')
    .in('categoria', [CATEGORIA_RETORNO, CATEGORIA_PROTOCOLO])
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as ArquivoRetorno[];
}

/**
 * Arquiva o retorno recebido SEM MODIFICAR o arquivo + o protocolo de recebimento gerado.
 * Nada aqui altera template — a incorporação é um passo separado e explícito.
 */
export async function arquivarRetorno(params: {
  empresaId: string;
  templateId: string;
  usuarioId?: string;
  arquivo: File;
  protocoloMd: string;
}) {
  const recebido = await uploadArquivo({
    bucket: 'contratos-arquivos',
    empresaId: params.empresaId,
    entidadeTipo: 'contrato_template',
    entidadeId: params.templateId,
    categoria: CATEGORIA_RETORNO,
    usuarioId: params.usuarioId,
    file: params.arquivo,
  });
  const protocolo = await uploadArquivo({
    bucket: 'contratos-arquivos',
    empresaId: params.empresaId,
    entidadeTipo: 'contrato_template',
    entidadeId: params.templateId,
    categoria: CATEGORIA_PROTOCOLO,
    usuarioId: params.usuarioId,
    file: new File([params.protocoloMd], `protocolo-${new Date().toISOString().slice(0, 10)}-${params.arquivo.name}.md`, {
      type: 'text/markdown',
    }),
  });
  return { recebido, protocolo };
}

/** Baixa um arquivo arquivado (retorno original ou protocolo) do Storage. */
export async function baixarArquivoRetorno(caminhoStorage: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from('contratos-arquivos').download(caminhoStorage);
  if (error) throw error;
  return data;
}

// Status derivado do retorno: lógica PURA em comparador.ts (testável sem cliente Supabase);
// reexportada aqui por conveniência da UI. PDF nunca passa de RECEBIDO sozinho.
export { statusRetornoDerivado, STATUS_RETORNO_LABEL, type StatusRetorno } from './comparador';

// ---------------------------------------------------------------------------
// CONTRATOS IMPACTADOS por template (Fases 16/17 — decisão HUMANA de migração)
// ---------------------------------------------------------------------------

export type ContratoImpactado = {
  id: string;
  contrato_id: string;
  numero: number;
  rotulo: string | null;
  status: string;
  hash_sha256: string | null;
  criado_em: string;
  versaoTemplateUsada: number | null;
  contratoStatus: string | null;
  motoristaNome: string | null;
};

export async function listContratosPorTemplate(templateId: string): Promise<ContratoImpactado[]> {
  const { data, error } = await supabase
    .from('contrato_versoes')
    .select('id, contrato_id, numero, rotulo, status, hash_sha256, criado_em, snapshot, contratos(status, motoristas(nome_completo))')
    .eq('template_id', templateId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  type Linha = {
    id: string;
    contrato_id: string;
    numero: number;
    rotulo: string | null;
    status: string;
    hash_sha256: string | null;
    criado_em: string;
    snapshot: { _meta?: { template_versao?: number } } | null;
    contratos: { status: string; motoristas: { nome_completo: string } | null } | null;
  };
  return (data as unknown as Linha[]).map((l) => ({
    id: l.id,
    contrato_id: l.contrato_id,
    numero: l.numero,
    rotulo: l.rotulo,
    status: l.status,
    hash_sha256: l.hash_sha256,
    criado_em: l.criado_em,
    versaoTemplateUsada: l.snapshot?._meta?.template_versao ?? null,
    contratoStatus: l.contratos?.status ?? null,
    motoristaNome: l.contratos?.motoristas?.nome_completo ?? null,
  }));
}

export const DECISAO_MIGRACAO_OPCOES = [
  { valor: 'nao_alterar', rotulo: 'Não alterar (permanece na versão assinada)' },
  { valor: 'nova_versao', rotulo: 'Criar nova versão do contrato' },
  { valor: 'aditivo', rotulo: 'Gerar aditivo' },
  { valor: 'encerrar_renovar', rotulo: 'Encerrar / renovar' },
] as const;
