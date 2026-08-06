// Tipos do Dashboard/BOS (Missão 5, Fase 2) — espelha supabase/migrations/0013_missao5_business_operating_system.sql.

export type MetaStatus = 'em_andamento' | 'concluida' | 'cancelada';
export type MetaUnidade = 'numero' | 'moeda' | 'percentual';

export type Meta = {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string | null;
  unidade: MetaUnidade;
  valor_alvo: number;
  valor_atual: number;
  data_alvo: string | null;
  status: MetaStatus;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export const META_STATUS_LABEL: Record<MetaStatus, string> = {
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const META_UNIDADE_LABEL: Record<MetaUnidade, string> = {
  numero: 'Número',
  moeda: 'Moeda (R$)',
  percentual: 'Percentual (%)',
};
