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
  // Coluna existe desde a Sprint 9 (DEC-060, migration 0007) mas nunca tinha sido exposta
  // aqui nem em nenhuma UI de upload — fechado na Missão 4 (fase 1/2, achado #3 da auditoria
  // de jornada: "documentos vencendo" era impossível de calcular sem este campo chegar à UI).
  data_validade: string | null;
  // Missão 5, Fase 4 — lineage (DEC-112), mesmo padrão de `lancamentos.criado_via`. Sempre
  // 'manual' hoje (nenhum produtor automático de arquivo existe); ponto de extensão para
  // Vistoria Inteligente/Agente/IA, sem UI nova.
  criado_via: 'manual' | 'automacao' | 'agente' | 'ia';
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

// audit_log é da Fase 0 (não é uma capability genérica por entidade_tipo/entidade_id como
// as acima — é chaveada por tabela/registro_id), mas é o dado real por trás da aba "Histórico".
export type AuditLogEntry = {
  id: string;
  empresa_id: string | null;
  tabela: string;
  registro_id: string | null;
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  dados_antigos: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  usuario_id: string | null;
  criado_em: string;
};
