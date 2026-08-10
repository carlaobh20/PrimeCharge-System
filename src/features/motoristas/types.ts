// Tipos do módulo Motoristas — espelha supabase/migrations/0004_modulo_motoristas.sql.
// Modelo A confirmado por Carlos na Sprint 6 (motorista = cliente final da locação, ver
// DEC-006 atualizada e DEC-025) — Contrato (futuro) se relaciona direto a Motorista.

export type MotoristaStatus = 'lead' | 'em_analise' | 'ativo' | 'inativo' | 'bloqueado' | 'encerrado';

// Épico 6 — CRM PrimeCharge / Jornada do Motorista, Fase 1 (migration 0025). Campo
// DELIBERADAMENTE separado de `status` acima — ver comentário no topo da migration 0025 pra
// entender por que não viraram um enum só. `status` continua governando bloqueio/desbloqueio
// e a propagação automática com Contrato; `etapa_funil` só governa o Kanban de CRM.
export type MotoristaEtapaFunil =
  | 'novo_lead'
  | 'primeiro_contato'
  | 'interessado'
  | 'documentacao'
  | 'analise_financeira'
  | 'analise_juridica'
  | 'entrevista'
  | 'aprovado'
  | 'aguardando_veiculo'
  | 'contrato_assinado'
  | 'entrega_veiculo'
  | 'motorista_ativo'
  | 'fidelizacao'
  | 'encerrado';

export type MotoristaPrioridade = 'baixa' | 'media' | 'alta' | 'critica';

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
  // Épico 6, Fase 1 (migration 0025) — null em motoristas cadastrados antes da migration
  // (nunca reclassificado artificialmente, ver comentário da coluna no SQL).
  etapa_funil: MotoristaEtapaFunil | null;
  etapa_funil_desde: string | null;
  responsavel_id: string | null;
  prioridade: MotoristaPrioridade;
  criado_em: string;
  atualizado_em: string;
};

export const MOTORISTA_ETAPA_FUNIL_ORDEM: MotoristaEtapaFunil[] = [
  'novo_lead',
  'primeiro_contato',
  'interessado',
  'documentacao',
  'analise_financeira',
  'analise_juridica',
  'entrevista',
  'aprovado',
  'aguardando_veiculo',
  'contrato_assinado',
  'entrega_veiculo',
  'motorista_ativo',
  'fidelizacao',
  'encerrado',
];

export const MOTORISTA_ETAPA_FUNIL_LABEL: Record<MotoristaEtapaFunil, string> = {
  novo_lead: 'Novo Lead',
  primeiro_contato: 'Primeiro Contato',
  interessado: 'Interessado',
  documentacao: 'Documentação',
  analise_financeira: 'Análise Financeira',
  analise_juridica: 'Análise Jurídica',
  entrevista: 'Entrevista',
  aprovado: 'Aprovado',
  aguardando_veiculo: 'Aguardando Veículo',
  contrato_assinado: 'Contrato Assinado',
  entrega_veiculo: 'Entrega do Veículo',
  motorista_ativo: 'Motorista Ativo',
  fidelizacao: 'Fidelização',
  encerrado: 'Encerrado',
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
