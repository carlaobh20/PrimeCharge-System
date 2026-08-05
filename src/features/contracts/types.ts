// Tipos do módulo Contratos — espelha supabase/migrations/0005_modulo_contratos.sql.
// Contrato liga Empresa → Motorista → Veículo (DEC-006 confirmada: Motorista = Cliente final,
// não existe entidade Cliente separada).

export type ContratoStatus =
  | 'rascunho'
  | 'em_analise'
  | 'aprovado'
  | 'assinado'
  | 'ativo'
  | 'renovacao'
  | 'encerrado'
  | 'cancelado';

export type ContratoPeriodicidade = 'diaria' | 'semanal' | 'mensal';

export type Contrato = {
  id: string;
  empresa_id: string;
  veiculo_id: string;
  motorista_id: string;
  status: ContratoStatus;
  data_inicio: string;
  data_fim_prevista: string | null;
  data_fim_real: string | null;
  periodicidade: ContratoPeriodicidade;
  valor_periodico: number;
  valor_caucao: number | null;
  km_inicial: number | null;
  km_final: number | null;
  carga_inicial_pct: number | null;
  carga_final_pct: number | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
};

// Junções mínimas necessárias pro Cockpit (nome/placa) sem duplicar o resto do módulo
// Veículo/Motorista — mesmo padrão de VeiculoComRelacoes (marca/modelo).
export type ContratoComRelacoes = Contrato & {
  veiculo: { id: string; placa: string; status: string };
  motorista: { id: string; nome_completo: string; status: string };
};

export const CONTRATO_STATUS_LABEL: Record<ContratoStatus, string> = {
  rascunho: 'Rascunho',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  assinado: 'Assinado',
  ativo: 'Ativo',
  renovacao: 'Renovação',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
};

// State Machine do Contrato (CORE_CONCEPTS.md, seção 2) — validada também no banco
// (fn_validar_transicao_contrato, migration 0005) para nenhuma transição inválida ser
// possível mesmo fora desta tela (ver DEC-035).
export const CONTRATO_STATUS_TRANSITIONS: Record<ContratoStatus, ContratoStatus[]> = {
  rascunho: ['em_analise', 'cancelado'],
  em_analise: ['aprovado', 'cancelado'],
  aprovado: ['assinado', 'cancelado'],
  assinado: ['ativo', 'cancelado'],
  ativo: ['renovacao', 'encerrado', 'cancelado'],
  renovacao: ['ativo', 'encerrado', 'cancelado'],
  encerrado: [],
  cancelado: [],
};

export const CONTRATO_STATUS_COLOR: Record<
  ContratoStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive'
> = {
  rascunho: 'secondary',
  em_analise: 'info',
  aprovado: 'info',
  assinado: 'warning',
  ativo: 'success',
  renovacao: 'warning',
  encerrado: 'secondary',
  cancelado: 'destructive',
};

export const CONTRATO_PERIODICIDADE_LABEL: Record<ContratoPeriodicidade, string> = {
  diaria: 'Diária',
  semanal: 'Semanal',
  mensal: 'Mensal',
};
