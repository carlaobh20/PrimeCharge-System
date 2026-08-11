import type { LinhaAmortizacao, SistemaAmortizacao } from '@/shared/lib/amortizacao';

// Épico 9 — Motor de Expansão da Frota, Fase 1.

export type CenarioExpansao = {
  id: string;
  empresa_id: string;
  nome: string;
  capital_disponivel: number;
  reserva_minima: number;
  preco_veiculo: number;
  entrada_por_veiculo: number;
  taxa_juros_am_pct: number;
  prazo_financiamento_meses: number;
  sistema_amortizacao: SistemaAmortizacao;
  aluguel_semanal_por_veiculo: number;
  ocupacao_pct: number;
  km_mensal_por_veiculo: number;
  seguro_mensal_por_veiculo: number;
  ipva_anual_por_veiculo: number;
  rastreador_mensal_por_veiculo: number;
  manutencao_por_km: number;
  contador_mensal: number;
  aliquota_tributos_pct: number;
  horizonte_meses: 12 | 24 | 36 | 60;
  venda_programada_mes: number | null;
  venda_valor_estimado: number | null;
  venda_custos_pct: number;
  dscr_minimo_saudavel: number;
  dscr_minimo_atencao: number;
  /** Fase 2 (migration 0033) — meses após a PRÓPRIA compra em que um veículo projetado é vendido. null = nenhuma venda recorrente (método "somente caixa operacional"). */
  vender_apos_meses: number | null;
  /** Fase 2 — premissa fixa do usuário aplicada a todo veículo projetado vendido. Nunca inferida de mercado/FIPE (DEC-022). */
  valor_venda_por_veiculo: number | null;
  metodo_crescimento: MetodoCrescimento;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type CenarioExpansaoInput = Omit<CenarioExpansao, 'id' | 'empresa_id' | 'criado_por' | 'criado_em' | 'atualizado_em'>;

export type EstrategiaExpansao = 'conservadora' | 'balanceada' | 'agressiva';

export const ESTRATEGIA_LABEL: Record<EstrategiaExpansao, string> = {
  conservadora: 'Conservadora',
  balanceada: 'Balanceada',
  agressiva: 'Agressiva',
};

// Épico 9 — Fase 2 (Crescimento Composto). 'caixa_aporte' existe no enum do banco (migration
// 0033) reservado para a Fase 3, mas calcularCrescimentoComposto() ainda não sabe simulá-lo —
// ver checagem explícita no motor (recusa em vez de fingir), não é um TODO esquecido.
export type MetodoCrescimento = 'caixa_operacional' | 'caixa_e_venda' | 'caixa_aporte';

export const METODO_CRESCIMENTO_LABEL: Record<MetodoCrescimento, string> = {
  caixa_operacional: 'Somente caixa operacional',
  caixa_e_venda: 'Caixa operacional + venda programada',
  caixa_aporte: 'Caixa + venda + novo aporte (ainda não implementado)',
};

export type HorizonteCrescimento = 12 | 24 | 36 | 48 | 60;

/**
 * Um veículo dentro da simulação de crescimento — `origem: 'projetado'` só existe dentro da
 * projeção e nunca é escrito em `veiculos` (seção 8 do brief original: "não criar veículos reais
 * no banco"). `origem: 'real'` é o espelho, dentro desta mesma simulação, de um veículo que JÁ
 * existe em `veiculos` hoje (Fase 2.1, Parte 2) — sua dívida/receita real continuam sendo
 * simuladas mês a mês, mas ele nunca é "comprado" ou "vendido" por este motor.
 */
export type VeiculoProjetado = {
  numero: number;
  origem: 'real' | 'projetado';
  /** Placa, só para origem 'real' — identifica o veículo na interface/auditoria. */
  identificador: string | null;
  mesCompra: number;
  precoCompra: number;
  entrada: number;
  valorFinanciado: number;
  vendidoNoMes: number | null;
  /** Fase 2.1 — receita mensal deste veículo específico: premissa uniforme do cenário para
   * origem 'projetado', receita REAL do contrato ativo (ou 0, se nenhum) para origem 'real'. */
  receitaMensal: number;
  /** Fase 2.1 — custo operacional mensal deste veículo. Sempre a premissa uniforme do cenário
   * (seguro/IPVA/rastreador/manutenção) mesmo para veículos reais — não existe fonte confiável de
   * custo real por veículo hoje (ver mapa da Parte 1: `lancamentos` sem vínculo não é
   * distinguível de "sem custo"). Rotulado como PREMISSA na interface, nunca como DADO REAL. */
  custoOperacionalMensal: number;
  /** Valor atual do veículo para fins de equity. `cenario.preco_veiculo` (fixo) para origem
   * 'projetado'; `resolverValorAtualVeiculo` para origem 'real' — `null` se o veículo real não
   * tem `valor_mercado`/`valor_fipe`/`valor_compra` cadastrado (nunca vira 0 nem o preço do
   * cenário: DEC-022, não inventamos valor de um veículo real). */
  valorAtual: number | null;
};

/**
 * Fase 2.1, Parte 2 — um veículo REAL (já em `veiculos`) preparado para entrar como ponto de
 * partida do motor de crescimento. Cada campo é ou um dado real recalculado ao vivo, ou um `null`
 * explícito quando a informação não existe — nunca uma estimativa disfarçada.
 */
export type VeiculoRealParaProjecao = {
  veiculoId: string;
  identificador: string;
  /** Tabela de amortização completa (desde o 1º mês do financiamento real), ou `[]` se o
   * veículo não tem financiamento válido cadastrado (compra direta ou dados incompletos). */
  tabela: LinhaAmortizacao[];
  mesesDecorridos: number;
  /** 0 se o veículo não tem financiamento (nunca `null` — "sem financiamento" é um fato, não uma
   * informação faltando). */
  saldoDevedorAtual: number;
  /** `resolverValorAtualVeiculo` (mercado → FIPE → compra). `null` se as 3 fontes estiverem
   * vazias — este veículo não entra na soma de equity da projeção, mas continua contando na
   * frota e sua dívida continua sendo simulada normalmente. */
  valorAtual: number | null;
  /** Receita mensal equivalente do contrato ATIVO deste veículo hoje, ou 0 se não há contrato
   * ativo (fato real, não estimativa). */
  receitaMensalReal: number;
};

export type TipoEventoCrescimento = 'compra_autorizada' | 'compra_bloqueada' | 'venda';

/** Fase 2, seção 18 — audit trail: cada expansão (ou recusa de expansão) precisa de uma causa matemática registrada, não só um número final. */
export type EventoCrescimento = {
  mes: number;
  tipo: TipoEventoCrescimento;
  veiculoNumero: number | null;
  descricao: string;
  numeros: Record<string, number>;
  motivoBloqueio?: 'reserva_insuficiente' | 'limite_de_divida';
};

export type MesCrescimento = {
  mes: number;
  frotaTotal: number;
  veiculosComprados: number;
  veiculosVendidos: number;
  caixaInicial: number;
  receita: number;
  custosOperacionais: number;
  jurosDoMes: number;
  amortizacaoDoMes: number;
  fluxoDeCaixa: number;
  produtoLiquidoVendas: number;
  caixaFinal: number;
  dividaTotal: number;
  equityTotal: number;
  patrimonioLiquido: number;
  dscr: number | null;
};

export type ProximoVeiculoProjetado =
  | { possivel: true; numero: number; mesEstimado: number; capitalNecessario: number; capitalDisponivelProjetado: number }
  | { possivel: false; motivo: 'aguardando caixa operacional' | 'aguardando venda' | 'reserva insuficiente' | 'limite de dívida' | 'horizonte esgotado'; capitalNecessario: number; capitalDisponivelProjetado: number; gap: number };

export type ResultadoCrescimentoComposto = {
  estrategia: EstrategiaExpansao;
  horizonte: HorizonteCrescimento;
  metodo: MetodoCrescimento;
  meses: MesCrescimento[];
  veiculos: VeiculoProjetado[];
  eventos: EventoCrescimento[];
  proximoVeiculo: ProximoVeiculoProjetado;
  frotaInicial: number;
  frotaFinal: number;
  veiculosCompradosTotal: number;
  veiculosVendidosTotal: number;
  receitaAcumulada: number;
  fluxoDeCaixaAcumulado: number;
  dividaFinal: number;
  equityFinal: number;
  caixaFinal: number;
  patrimonioFinal: number;
  patrimonioInicial: number;
  crescimentoPatrimonialPct: number | null;
  capitalExternoNecessario: number;
  crescimentoAutofinanciadoPct: number | null;
  /** Fase 2.1, Parte 2 — quantos veículos REAIS (já existentes hoje) entraram como ponto de
   * partida desta simulação, contando desde o mês 0. */
  frotaRealIntegrada: number;
  /** Quantos desses veículos reais não têm `valor_mercado`/`valor_fipe`/`valor_compra`
   * cadastrado — não entram na soma de equity (Parte 4: nunca inventamos o valor). */
  frotaRealSemValorConhecido: number;
};
