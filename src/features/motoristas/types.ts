// Tipos do módulo Motoristas — espelha supabase/migrations/0004_modulo_motoristas.sql.
// Modelo A confirmado por Carlos na Sprint 6 (motorista = cliente final da locação, ver
// DEC-006 atualizada e DEC-025) — Contrato (futuro) se relaciona direto a Motorista.

export type MotoristaStatus = 'lead' | 'em_analise' | 'ativo' | 'inativo' | 'bloqueado' | 'encerrado';

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
  criado_em: string;
  atualizado_em: string;
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
