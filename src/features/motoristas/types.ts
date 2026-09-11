// Tipos do módulo Motoristas — espelha supabase/migrations/0004_modulo_motoristas.sql.
// Modelo A confirmado por Carlos na Sprint 6 (motorista = cliente final da locação, ver
// DEC-006 atualizada e DEC-025) — Contrato (futuro) se relaciona direto a Motorista.

export type MotoristaStatus = 'lead' | 'em_analise' | 'ativo' | 'inativo' | 'bloqueado' | 'encerrado';

// Épico 6 — CRM RodaVolt / Jornada do Motorista, Fase 1.1 (migration 0026). As etapas do
// funil DEIXARAM de ser um enum fixo (motorista_etapa_funil, migration 0025) e viraram dado —
// tabela `funil_etapas`, editável por empresa (Carlos pediu pra poder adicionar/excluir fase
// direto pela tela). `grupo` é o que permite o painel de métricas continuar funcionando mesmo
// com etapas renomeadas/criadas/removidas: a métrica agrega por GRUPO, nunca pelo nome literal
// da etapa. `status` (acima) continua intocado — mesma separação da migration 0025.
export type FunilEtapaGrupo = 'lead' | 'em_analise' | 'aprovado' | 'fila' | 'ativo' | 'encerrado' | 'nenhum';

export type FunilEtapa = {
  id: string;
  empresa_id: string;
  nome: string;
  grupo: FunilEtapaGrupo;
  ordem: number;
  ativa: boolean;
  criado_em: string;
  atualizado_em: string;
};

export const FUNIL_ETAPA_GRUPO_LABEL: Record<FunilEtapaGrupo, string> = {
  lead: 'Lead',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  fila: 'Fila (sem veículo)',
  ativo: 'Ativo',
  encerrado: 'Encerrado',
  nenhum: 'Nenhum (não entra em métrica agregada)',
};

export type MotoristaPrioridade = 'baixa' | 'media' | 'alta' | 'critica';

// Épico 6, Fase 1.2 (migration 0027) — de onde o lead veio. Opcional: motoristas cadastrados
// antes desta fase, ou cadastrados sem essa informação à mão, ficam null — nunca inferimos.
export type OrigemLead = 'indicacao' | 'rede_social' | 'propaganda' | 'busca_organica' | 'evento' | 'outro';

export const ORIGEM_LEAD_LABEL: Record<OrigemLead, string> = {
  indicacao: 'Indicação',
  rede_social: 'Rede social',
  propaganda: 'Propaganda',
  busca_organica: 'Busca orgânica',
  evento: 'Evento',
  outro: 'Outro',
};

export type Motorista = {
  id: string;
  empresa_id: string;
  nome_completo: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  cnh_numero: string | null;
  cnh_categoria: string | null;
  cnh_validade: string | null;
  status: MotoristaStatus;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  // Épico 6, Fase 1.1 (migration 0026) — substitui `etapa_funil` (enum, migration 0025, agora
  // histórico morto no banco, não lido/escrito pelo app). Null em motoristas ainda não
  // classificados (nunca reclassificado artificialmente, DEC-022).
  etapa_funil_id: string | null;
  etapa_funil_desde: string | null;
  responsavel_id: string | null;
  prioridade: MotoristaPrioridade;
  origem_lead: OrigemLead | null;
  origem_lead_detalhe: string | null;
  criado_em: string;
  atualizado_em: string;
};

export const MOTORISTA_PRIORIDADE_LABEL: Record<MotoristaPrioridade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

export const MOTORISTA_PRIORIDADE_COLOR: Record<MotoristaPrioridade, 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive'> = {
  baixa: 'secondary',
  media: 'info',
  alta: 'warning',
  critica: 'destructive',
};

export const MOTORISTA_STATUS_LABEL: Record<MotoristaStatus, string> = {
  lead: 'Lead',
  em_analise: 'Em análise',
  ativo: 'Ativo',
  inativo: 'Inativo',
  bloqueado: 'Bloqueado',
  encerrado: 'Encerrado',
};

// State Machine do Motorista (CORE_CONCEPTS.md, seção 2) — mesmo padrão de
// VEICULO_STATUS_TRANSITIONS. "encerrado" é terminal; "bloqueado" sempre pode voltar pra
// "ativo" (desbloqueio) ou ir direto pra "encerrado" (desligamento definitivo).
export const MOTORISTA_STATUS_TRANSITIONS: Record<MotoristaStatus, MotoristaStatus[]> = {
  lead: ['em_analise', 'encerrado'],
  em_analise: ['ativo', 'encerrado'],
  ativo: ['inativo', 'bloqueado', 'encerrado'],
  inativo: ['ativo', 'encerrado'],
  bloqueado: ['ativo', 'encerrado'],
  encerrado: [],
};

export const MOTORISTA_STATUS_COLOR: Record<
  MotoristaStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive'
> = {
  lead: 'secondary',
  em_analise: 'info',
  ativo: 'success',
  inativo: 'warning',
  bloqueado: 'destructive',
  encerrado: 'secondary',
};
