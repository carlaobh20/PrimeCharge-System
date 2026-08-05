// Tipos do módulo Financeiro — espelha supabase/migrations/0006_modulo_financeiro.sql.
// Receita e Despesa são unificadas em Lancamento (tipo) — Provisão é lancamento com
// status 'prevista', não uma entidade própria (DEC-046). Pagamento é o evento real de
// movimentação bancária, separado do lançamento contábil.

export type LancamentoTipo = 'receita' | 'despesa';
export type LancamentoStatus = 'prevista' | 'confirmada' | 'cancelada';
export type LancamentoOrigem = 'manual' | 'automacao' | 'agente' | 'ia';
export type PagamentoStatus = 'pendente' | 'pago' | 'cancelado' | 'estornado';
export type FormaPagamento = 'pix' | 'boleto' | 'cartao' | 'transferencia' | 'dinheiro' | 'outro';
export type ContaBancariaTipo = 'corrente' | 'poupanca' | 'investimento';
export type MotoristaMotivoEncerramento =
  | 'lead_nao_avancou'
  | 'reprovado_analise'
  | 'encerrado_motorista'
  | 'encerrado_empresa'
  | 'bloqueio_definitivo';
export type VeiculoMotivoBaixa = 'venda_comercial' | 'sinistro_perda_total' | 'roubo_furto' | 'outro';

export type ContaBancaria = {
  id: string;
  empresa_id: string;
  nome: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo: ContaBancariaTipo;
  saldo_inicial: number;
  ativa: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type CentroCusto = {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type Lancamento = {
  id: string;
  empresa_id: string;
  tipo: LancamentoTipo;
  status: LancamentoStatus;
  descricao: string;
  valor: number;
  categoria: string | null;
  centro_custo_id: string | null;
  contrato_id: string | null;
  veiculo_id: string | null;
  motorista_id: string | null;
  data_prevista: string;
  data_confirmacao: string | null;
  criado_via: LancamentoOrigem;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type LancamentoComRelacoes = Lancamento & {
  centro_custo: { id: string; nome: string } | null;
  contrato: { id: string; veiculo_id: string; motorista_id: string } | null;
  veiculo: { id: string; placa: string } | null;
  motorista: { id: string; nome_completo: string } | null;
};

export type Pagamento = {
  id: string;
  empresa_id: string;
  lancamento_id: string;
  conta_bancaria_id: string;
  status: PagamentoStatus;
  valor: number;
  forma_pagamento: FormaPagamento | null;
  data_prevista: string;
  data_pagamento: string | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type PagamentoComRelacoes = Pagamento & {
  lancamento: {
    id: string;
    tipo: LancamentoTipo;
    descricao: string;
    contrato_id: string | null;
    veiculo_id: string | null;
    motorista_id: string | null;
  } | null;
  conta_bancaria: { id: string; nome: string } | null;
};

export const LANCAMENTO_TIPO_LABEL: Record<LancamentoTipo, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
};

export const LANCAMENTO_STATUS_LABEL: Record<LancamentoStatus, string> = {
  prevista: 'Prevista',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};

// Espelha fn_validar_transicao_lancamento (migration 0006).
export const LANCAMENTO_STATUS_TRANSITIONS: Record<LancamentoStatus, LancamentoStatus[]> = {
  prevista: ['confirmada', 'cancelada'],
  confirmada: ['cancelada'],
  cancelada: [],
};

export const PAGAMENTO_STATUS_LABEL: Record<PagamentoStatus, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado',
  estornado: 'Estornado',
};

// Espelha fn_validar_transicao_pagamento (migration 0006). Sem "atrasado" — é sempre
// calculado (pendente + data_prevista < hoje), nunca um estado persistido (ver migration).
export const PAGAMENTO_STATUS_TRANSITIONS: Record<PagamentoStatus, PagamentoStatus[]> = {
  pendente: ['pago', 'cancelado'],
  pago: ['estornado'],
  cancelado: [],
  estornado: [],
};

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
  transferencia: 'Transferência',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
};

export const MOTORISTA_MOTIVO_ENCERRAMENTO_LABEL: Record<MotoristaMotivoEncerramento, string> = {
  lead_nao_avancou: 'Lead não avançou',
  reprovado_analise: 'Reprovado na análise',
  encerrado_motorista: 'Encerrado pelo motorista',
  encerrado_empresa: 'Encerrado pela empresa',
  bloqueio_definitivo: 'Bloqueio definitivo',
};

export const VEICULO_MOTIVO_BAIXA_LABEL: Record<VeiculoMotivoBaixa, string> = {
  venda_comercial: 'Venda comercial',
  sinistro_perda_total: 'Sinistro (perda total)',
  roubo_furto: 'Roubo/furto',
  outro: 'Outro',
};
