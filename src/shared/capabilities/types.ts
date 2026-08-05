// Tipos das Capabilities genéricas — CORE_CONCEPTS.md, seção 1.
// Toda entidade ganha estas capacidades por composição, via (entidade_tipo, entidade_id).

export type Arquivo = {
  id: string;
  empresa_id: string;
  entidade_tipo: string;
  entidade_id: string;
  categoria: string | null;
  nome_arquivo: string;
  caminho_storage: string;
  tipo_mime: string | null;
  tamanho_bytes: number | null;
  usuario_id: string | null;
  criado_em: string;
};

export type Comentario = {
  id: string;
  empresa_id: string;
  entidade_tipo: string;
  entidade_id: string;
  texto: string;
  usuario_id: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type Tag = {
  id: string;
  empresa_id: string;
  entidade_tipo: string;
  entidade_id: string;
  tag: string;
  usuario_id: string | null;
  criado_em: string;
};

export type TimelineEvento = {
  id: string;
  empresa_id: string;
  entidade_tipo: string;
  entidade_id: string;
  tipo: string;
  descricao: string;
  metadata: Record<string, unknown> | null;
  usuario_id: string | null;
  criado_em: string;
};

export type Favorito = {
  id: string;
  empresa_id: string;
  entidade_tipo: string;
  entidade_id: string;
  usuario_id: string;
  criado_em: string;
};
