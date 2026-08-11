import { gerarTabelaAmortizacao } from '@/shared/lib/amortizacao';
import { SEMANAS_POR_MES } from '../../intelligence/simulacaoEmpresarial';
import { calcularCapitalReciclavel } from './capitalReciclavel';
import { ESTRATEGIAS } from './estrategias';
import type { CenarioExpansao, EstrategiaExpansao } from '../types';
import type { Veiculo } from '@/features/frota/types';

// Épico 9 — Motor de Expansão, Fase 1. Responde a pergunta central da missão: "com o capital que
// eu tenho HOJE, quantos veículos cabem, e como fica a estrutura (parcela, DSCR, quitação,
// equity) ao longo do horizonte?" — uma pergunta de CAPACIDADE ESTÁTICA (quanto cabe agora), não
// de crescimento composto reinvestindo lucro mês a mês (isso já existe e não é duplicado aqui —
// é o motor do Épico 3, simularCrescimentoEmpresarial). O horizonte_meses aqui serve só para
// projetar o desempenho do LOTE comprado agora (fluxo de caixa incremental, DSCR, quando cada
// veículo quita) — não para comprar mais veículos no meio do caminho com lucro reinvestido.
//
// Reaproveita: gerarTabelaAmortizacao (shared/lib/amortizacao.ts, mesmo motor usado pelo
// financiamento real dos veículos e pelo simulador hipotético do Épico 3 — sem duplicar a conta
// de juros/amortização) e SEMANAS_POR_MES (mesma constante do Épico 3, para não haver dois
// números diferentes de "quantas semanas tem um mês" no sistema).

export type MesExpansao = {
  mes: number;
  veiculosNovos: number;
  compradosNoMes: number;
  caixaDisponivelParaAquisicao: number;
  receitaIncremental: number;
  despesaIncremental: number;
  parcelasIncrementais: number;
  saldoDevedorIncremental: number;
  valorFrotaIncremental: number;
  equityIncremental: number;
  /** NOI (receita − despesa operacional, antes da parcela) / parcelas do mês. null enquanto não há parcela vencida ainda (mês 0) — não inventamos um DSCR "infinito" nem "0" que pareceria um número real (DEC-022). */
  dscr: number | null;
  statusDscr: 'saudavel' | 'atencao' | 'insuficiente' | null;
};

export type ResultadoExpansao = {
  estrategia: EstrategiaExpansao;
  meses: MesExpansao[];
  veiculosAdicionadosTotal: number;
  capitalUsadoTotal: number;
  capitalDisponivelParaAquisicao: number;
  reservaMinimaAplicada: number;
  capitalReciclavelConsiderado: number;
  parcelaMensalPorVeiculo: number;
  valorFinanciadoPorVeiculo: number;
  /** true quando nem 1 veículo coube — capital insuficiente até para a entrada + reserva de um único veículo, nesta estratégia. */
  avisoCapitalInsuficienteParaUmVeiculo: boolean;
};

export function calcularExpansao(
  cenario: CenarioExpansao,
  veiculosFrotaAtual: Veiculo[],
  estrategia: EstrategiaExpansao,
  hoje: Date = new Date()
): ResultadoExpansao {
  const mult = ESTRATEGIAS[estrategia];

  const reciclavel = mult.usaCapitalReciclavel
    ? calcularCapitalReciclavel(veiculosFrotaAtual, cenario.venda_custos_pct, hoje).totalLiquido
    : 0;
  const capitalParaAquisicao = cenario.capital_disponivel * mult.fracaoCapitalUsavel + reciclavel;
  const reservaAplicada = cenario.reserva_minima * mult.multiplicadorReserva;
  const custoMinimoParaComprar = cenario.entrada_por_veiculo + reservaAplicada;

  // Capacidade estática: quantos veículos cabem de uma vez, comprados no mês 0.
  let veiculosAdicionados = 0;
  let caixaRestante = capitalParaAquisicao;
  while (caixaRestante >= custoMinimoParaComprar) {
    caixaRestante -= cenario.entrada_por_veiculo;
    veiculosAdicionados += 1;
  }

  const valorFinanciadoPorVeiculo = Math.max(0, cenario.preco_veiculo - cenario.entrada_por_veiculo);
  const tabela = gerarTabelaAmortizacao(
    valorFinanciadoPorVeiculo,
    cenario.taxa_juros_am_pct,
    cenario.prazo_financiamento_meses,
    cenario.sistema_amortizacao
  );
  const parcelaMensalPorVeiculo = tabela.length > 0 ? tabela[0].parcela : 0;

  const aluguelMensalPorVeiculo = cenario.aluguel_semanal_por_veiculo * SEMANAS_POR_MES;
  const ocupacao = cenario.ocupacao_pct / 100;
  const ipvaMensalPorVeiculo = cenario.ipva_anual_por_veiculo / 12;

  const meses: MesExpansao[] = [];
  for (let mes = 0; mes <= cenario.horizonte_meses; mes++) {
    // Veículos comprados no mês 0; tabela é 1-indexada pela 1ª parcela (mês seguinte à compra).
    const linha = mes >= 1 && mes <= tabela.length ? tabela[mes - 1] : null;

    const receitaIncremental = veiculosAdicionados * aluguelMensalPorVeiculo * ocupacao;
    const despesaOperacionalIncremental =
      veiculosAdicionados *
        (cenario.seguro_mensal_por_veiculo +
          ipvaMensalPorVeiculo +
          cenario.rastreador_mensal_por_veiculo +
          cenario.manutencao_por_km * cenario.km_mensal_por_veiculo) +
      cenario.contador_mensal;

    const parcelasIncrementais = linha ? linha.parcela * veiculosAdicionados : 0;
    const saldoDevedorIncremental = linha
      ? linha.saldoDevedor * veiculosAdicionados
      : mes === 0
        ? valorFinanciadoPorVeiculo * veiculosAdicionados
        : 0;

    const noi = receitaIncremental - despesaOperacionalIncremental;
    const dscr = parcelasIncrementais > 0 ? noi / parcelasIncrementais : null;
    const statusDscr: MesExpansao['statusDscr'] =
      dscr === null
        ? null
        : dscr >= cenario.dscr_minimo_saudavel
          ? 'saudavel'
          : dscr >= cenario.dscr_minimo_atencao
            ? 'atencao'
            : 'insuficiente';

    // Fase 1: sem curva de depreciação para a frota nova — o valor incremental fica no preço de
    // aquisição (o simulador hipotético do Épico 3 já modela depreciação para cenários
    // hipotéticos; replicar essa curva aqui sem ter sido pedida seria inventar uma premissa nova).
    const valorFrotaIncremental = veiculosAdicionados * cenario.preco_veiculo;
    const equityIncremental = valorFrotaIncremental - saldoDevedorIncremental;

    meses.push({
      mes,
      veiculosNovos: veiculosAdicionados,
      compradosNoMes: mes === 0 ? veiculosAdicionados : 0,
      caixaDisponivelParaAquisicao: caixaRestante,
      receitaIncremental,
      despesaIncremental: despesaOperacionalIncremental,
      parcelasIncrementais,
      saldoDevedorIncremental,
      valorFrotaIncremental,
      equityIncremental,
      dscr,
      statusDscr,
    });

    // Venda programada (seção 13 do brief): credita o valor líquido no caixa restante no mês
    // configurado. É uma venda de veículo(s) JÁ existente(s) na frota — não altera
    // veiculosAdicionados (fora do escopo da contagem incremental desta simulação); só reflete o
    // efeito de caixa, disponível a partir do mês seguinte na leitura da tela.
    if (cenario.venda_programada_mes === mes && cenario.venda_valor_estimado !== null) {
      const custosVenda = cenario.venda_valor_estimado * (cenario.venda_custos_pct / 100);
      caixaRestante += cenario.venda_valor_estimado - custosVenda;
    }
  }

  return {
    estrategia,
    meses,
    veiculosAdicionadosTotal: veiculosAdicionados,
    capitalUsadoTotal: veiculosAdicionados * cenario.entrada_por_veiculo,
    capitalDisponivelParaAquisicao: capitalParaAquisicao,
    reservaMinimaAplicada: reservaAplicada,
    capitalReciclavelConsiderado: reciclavel,
    parcelaMensalPorVeiculo,
    valorFinanciadoPorVeiculo,
    avisoCapitalInsuficienteParaUmVeiculo: veiculosAdicionados === 0,
  };
}

/** Roda as 3 estratégias fixas sobre o mesmo cenário — a "comparação de estratégias" pedida na tela. */
export function compararEstrategias(
  cenario: CenarioExpansao,
  veiculosFrotaAtual: Veiculo[],
  hoje: Date = new Date()
): Record<EstrategiaExpansao, ResultadoExpansao> {
  return {
    conservadora: calcularExpansao(cenario, veiculosFrotaAtual, 'conservadora', hoje),
    balanceada: calcularExpansao(cenario, veiculosFrotaAtual, 'balanceada', hoje),
    agressiva: calcularExpansao(cenario, veiculosFrotaAtual, 'agressiva', hoje),
  };
}
