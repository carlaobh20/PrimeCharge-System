// Tipos do Centro Jurídico — espelham supabase/migrations/0042_juridico_centro_contratos.sql.
// A migration 0042 NÃO foi aplicada em produção (só validada no harness local). Estes tipos
// existem para a camada de UI ser construída sobre a espinha já testada; nada aqui toca produção.
//
// Conceito central: o CONTRATO (tabela `contratos`, módulo Contratos) tem seu ciclo próprio
// (rascunho→ativo→encerrado). O DOCUMENTO versionado (`contrato_versoes`) é uma dimensão nova e
// separada — cada versão é imutável depois de congelada, com snapshot dos dados no momento da
// geração. Assinatura por parte (`contrato_assinaturas`) é outra dimensão. Aditivos nunca
// sobrescrevem o original.

// ============================ TEMPLATES ============================
export type ContratoTemplateStatus = 'rascunho' | 'publicado' | 'arquivado';

export type ContratoTemplate = {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  tipo: string; // texto livre: 'padrao','eletrico','empresarial'...
  corpo: string; // markdown/HTML com variáveis {{motorista.nome}} etc.
  variaveis: string[]; // chaves esperadas (jsonb no banco)
  status: ContratoTemplateStatus;
  versao_template: number;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export const CONTRATO_TEMPLATE_STATUS_LABEL: Record<ContratoTemplateStatus, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  arquivado: 'Arquivado',
};

// ============================ VERSÕES ============================
// State machine espelhada de fn_validar_transicao_versao (0042). Manter em sincronia com o banco:
// o banco é a barreira real (trigger); isto é só o espelho para o front habilitar/desabilitar ações.
export type ContratoVersaoStatus =
  | 'rascunho'
  | 'em_revisao'
  | 'aprovada'
  | 'aguardando_assinatura'
  | 'assinada'
  | 'vigente'
  | 'substituida'
  | 'cancelada';

export const CONTRATO_VERSAO_STATUS_LABEL: Record<ContratoVersaoStatus, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisão',
  aprovada: 'Aprovada',
  aguardando_assinatura: 'Aguardando assinatura',
  assinada: 'Assinada',
  vigente: 'Vigente',
  substituida: 'Substituída',
  cancelada: 'Cancelada',
};

// Espelha exatamente o CASE de fn_validar_transicao_versao. Só use para habilitar botões — a
// validação de verdade acontece no trigger do banco (que aborta a transição inválida).
export const CONTRATO_VERSAO_TRANSITIONS: Record<ContratoVersaoStatus, ContratoVersaoStatus[]> = {
  rascunho: ['em_revisao', 'cancelada'],
  em_revisao: ['aprovada', 'rascunho', 'cancelada'],
  aprovada: ['aguardando_assinatura', 'em_revisao', 'cancelada'],
  aguardando_assinatura: ['assinada', 'cancelada'],
  assinada: ['vigente', 'substituida'],
  vigente: ['substituida'],
  substituida: [],
  cancelada: [],
};

// Ao entrar em 'aguardando_assinatura' a versão CONGELA (congelada=true) — conteúdo imutável.
export const STATUS_QUE_CONGELA: ContratoVersaoStatus = 'aguardando_assinatura';
// Estados em que o motorista pode ver a versão do próprio contrato (espelha a RLS).
export const STATUS_VISIVEL_MOTORISTA: ContratoVersaoStatus[] = ['aguardando_assinatura', 'assinada', 'vigente'];

export type ContratoVersao = {
  id: string;
  empresa_id: string;
  contrato_id: string;
  template_id: string | null;
  numero: number;
  rotulo: string | null;
  status: ContratoVersaoStatus;
  snapshot: Record<string, unknown>; // dados congelados no momento da geração
  corpo: string | null; // documento renderizado (template + snapshot)
  hash_sha256: string | null;
  congelada: boolean;
  criado_por: string | null;
  aprovada_por: string | null;
  aprovada_em: string | null;
  congelada_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

// ============================ ASSINATURAS ============================
export type ContratoParte = 'motorista' | 'primecharge';

export type ContratoAssinaturaStatus =
  | 'nao_enviado'
  | 'enviado'
  | 'visualizado'
  | 'aceito'
  | 'assinado'
  | 'recusado'
  | 'expirado'
  | 'cancelado';

export const CONTRATO_ASSINATURA_STATUS_LABEL: Record<ContratoAssinaturaStatus, string> = {
  nao_enviado: 'Não enviado',
  enviado: 'Enviado',
  visualizado: 'Visualizado',
  aceito: 'Aceito',
  assinado: 'Assinado',
  recusado: 'Recusado',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
};

export const CONTRATO_PARTE_LABEL: Record<ContratoParte, string> = {
  motorista: 'Motorista',
  primecharge: 'PrimeCharge',
};

// Evidência registrada no aceite/assinatura. É EVIDÊNCIA — não afirma valor probatório absoluto.
export type ContratoAssinaturaEvidencia = {
  ip?: string;
  user_agent?: string;
  email?: string;
  telefone?: string;
  hash?: string;
  [k: string]: unknown;
};

export type ContratoAssinatura = {
  id: string;
  empresa_id: string;
  contrato_versao_id: string;
  parte: ContratoParte;
  ordem: number;
  signatario_usuario_id: string | null;
  status: ContratoAssinaturaStatus;
  evidencia: ContratoAssinaturaEvidencia;
  enviado_em: string | null;
  visualizado_em: string | null;
  assinado_em: string | null;
  motivo_recusa: string | null;
  criado_em: string;
  atualizado_em: string;
};

// ============================ ADITIVOS ============================
export type ContratoAditivoTipo = 'valor' | 'veiculo' | 'prazo' | 'motorista' | 'renovacao' | 'rescisao' | 'outro';
export type ContratoAditivoStatus = 'rascunho' | 'vigente' | 'cancelado';

export const CONTRATO_ADITIVO_TIPO_LABEL: Record<ContratoAditivoTipo, string> = {
  valor: 'Valor',
  veiculo: 'Veículo',
  prazo: 'Prazo',
  motorista: 'Motorista',
  renovacao: 'Renovação',
  rescisao: 'Rescisão',
  outro: 'Outro',
};

export const CONTRATO_ADITIVO_STATUS_LABEL: Record<ContratoAditivoStatus, string> = {
  rascunho: 'Rascunho',
  vigente: 'Vigente',
  cancelado: 'Cancelado',
};

export type ContratoAditivo = {
  id: string;
  empresa_id: string;
  contrato_id: string;
  contrato_versao_id: string | null;
  tipo: ContratoAditivoTipo;
  descricao: string | null;
  status: ContratoAditivoStatus;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

// ============================ INPUTS (frontend -> API) ============================
export type ContratoTemplateInput = {
  nome: string;
  descricao?: string | null;
  tipo?: string;
  corpo: string;
  variaveis?: string[];
  status?: ContratoTemplateStatus;
};

export type ContratoVersaoInput = {
  contrato_id: string;
  template_id?: string | null;
  numero: number;
  rotulo?: string | null;
  snapshot: Record<string, unknown>;
  corpo?: string | null;
  hash_sha256?: string | null;
};

export type ContratoAssinaturaInput = {
  contrato_versao_id: string;
  parte: ContratoParte;
  ordem?: number;
};

export type ContratoAditivoInput = {
  contrato_id: string;
  contrato_versao_id?: string | null;
  tipo: ContratoAditivoTipo;
  descricao?: string | null;
};
