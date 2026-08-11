// Tipos do módulo Financeiro — espelha supabase/migrations/0006_modulo_financeiro.sql e,
// para Plano de Contas/Centro de Resultado/rastreabilidade, 0028_epico7_controladoria_fundacao.sql.
// Receita e Despesa são unificadas em Lancamento (tipo) — Provisão é lancamento com
// status 'prevista', não uma entidade própria (DEC-046). Pagamento é o evento real de
// movimentação bancária, separado do lançamento contábil.

export type LancamentoTipo = 'receita' | 'despesa';
export type PlanoContaGrupo = 'receita' | 'custo' | 'despesa' | 'financeiro' | 'investimento' | 'patrimonio';
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

// Plano de Contas (Épico 7) — classificação contábil estruturada, PARALELA a
// lancamentos.categoria (texto livre), não uma substituição. parent_id permite hierarquia,
// mas esta fase só tem a raiz (6 grupos) — sem tela de criação/edição ainda.
export type PlanoConta = {
  id: string;
  empresa_id: string;
  parent_id: string | null;
  nome: string;
  grupo: PlanoContaGrupo;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

// Centro de Resultado (Épico 7) — distinto de CentroCusto (migration 0006): agrupa
// RECEITA/resultado, não custo operacional. Mesma ressalva: sem tela de gestão nesta fase.
export type CentroResultado = {
  id: string;
  empresa_id: string;
  nome: string;
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
  // Épico 7 (migration 0028) — conta_contabil_id/centro_resultado_id/competencia são
  // opcionalmente preenchidos manualmente aqui, ou pelo trigger fn_classificar_lancamento_
  // automaticamente no banco quando ficam NULL na criação (regra de classificação casando
  // por substring). Seleção manual sempre vence — o trigger só preenche o que está NULL.
  conta_contabil_id: string | null;
  centro_resultado_id: string | null;
  competencia: string | null;
  usuario_id: string | null;
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
