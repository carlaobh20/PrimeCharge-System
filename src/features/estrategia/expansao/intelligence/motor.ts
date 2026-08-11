import { gerarTabelaAmortizacao } from '@/shared/lib/amortizacao';
import { SEMANAS_POR_MES } from '../../intelligence/simulacaoEmpresarial';
import { calcularCapitalReciclavel } from './capitalReciclavel';
import { ESTRATEGIAS } from './estrategias';
import type { CenarioExpansao, EstrategiaExpansao } from '../types';
import type { Veiculo } from '@/features/frota/types';

// Épico 9 — Motor de Expansão, Fase 1 (revisado na Fase 1.1, 2026-08-11, com as correções
// pedidas pelo Carlos após o primeiro relatório de entrega — ver comentários marcados
// "[Fase 1.1]" abaixo). Responde a pergunta central: "com o capital que eu tenho HOJE, quantos
// veículos cabem, e como fica a estrutura (parcela, DSCR, quitação, equity) ao longo do
// horizonte?" — uma pergunta de CAPACIDADE ESTÁTICA (quanto cabe agora), não de crescimento
// composto reinvestindo lucro mês a mês (isso já existe e não é duplicado aqui — é o motor do
// Épico 3, simularCrescimentoEmpresarial). "Próximo marco" (calcularProximoMarco, abaixo) é o
// primeiro passo em direção a projeção de expansão composta pedida na seção 9 do brief de
// fechamento: quando o CAIXA OPERACIONAL do lote já comprado, sozinho, cobre o próximo veículo —
// sem inventar uma data quando isso não acontece dentro do horizonte.
//
// Reaproveita: gerarTabelaAmortizacao (shared/lib/amortizacao.ts, mesmo motor usado pelo
// financiamento real dos veículos e pelo simulador hipotético do Épico 3) e SEMANAS_POR_MES
// (mesma constante do Épico 3).

export type MesExpansao = {
  mes: number;
  veiculosNovos: number;
  compradosNoMes: number;
  /** [Fase 1.1] Sobra do capital reservado pra aquisição (capital_disponivel × fração da estratégia, JAMAIS inclui capital reciclável — ver estrategias.ts). */
  caixaDisponivelParaAquisicao: number;
  receitaIncremental: number;
  despesaIncremental: number;
  parcelasIncrementais: number;
  /** [Fase 1.1] Fluxo de caixa livre do mês (receita − despesa operacional − parcela) acumulado desde o mês 0 dos veículos desta expansão — NÃO é "caixa real da empresa", é só o que este lote específico gerou/consumiu. Usado por calcularProximoMarco. */
  caixaOperacionalAcumulado: number;
  saldoDevedorIncremental: number;
  valorFrotaIncremental: number;
  equityIncremental: number;
  /** [Fase 1.1] caixaOperacionalAcumulado + equityIncremental — "quanto essa expansão específica já vale", caixa e patrimônio somados (não confundir com "caixa real da empresa" nem com equityIncremental sozinho). */
  patrimonioTotalIncremental: number;
  /** NOI (receita − despesa operacional, antes da parcela) / parcelas do mês. null enquanto não há parcela vencida ainda (mês 0) — não inventamos um DSCR "infinito" nem "0" que pareceria um número real (DEC-022). */
  dscr: number | null;
  statusDscr: 'saudavel' | 'atencao' | 'insuficiente' | null;
};

export type ProximoMarco =
  | { possivel: true; mesesAteProximoVeiculo: number }
  | { possivel: false; motivo: string };

export type ResultadoExpansao = {
  estrategia: EstrategiaExpansao;
  meses: MesExpansao[];
  veiculosAdicionadosTotal: number;
  capitalUsadoTotal: number;
  /** [Fase 1.1] Só capital_disponivel × fração da estratégia — NUNCA inclui capital reciclável. */
  capitalDisponivelParaAquisicao: number;
  reservaMinimaAplicada: number;
  /** [Fase 1.1] Informativo apenas — quanto existe de capital reciclável (veículos 'venda'), NÃO somado a capitalDisponivelParaAquisicao. Ver estrategias.ts. */
  capitalReciclavelPotencial: number;
  parcelaMensalPorVeiculo: number;
  valorFinanciadoPorVeiculo: number;
  /** true quando nem 1 veículo coube — capital insuficiente até para a entrada + reserva de um único veículo, nesta estratégia. */
  avisoCapitalInsuficienteParaUmVeiculo: boolean;
  proximoMarco: ProximoMarco;
};

export function calcularExpansao(
  cenario: CenarioExpansao,
  veiculosFrotaAtual: Veiculo[],
  estrategia: EstrategiaExpansao,
  hoje: Date = new Date()
): ResultadoExpansao {
  const mult = ESTRATEGIAS[estrategia];

  // [Fase 1.1] Capital reciclável é SEMPRE só informativo — nunca soma ao pool de aquisição de
  // nenhuma estratégia (correção da seção 7/8: equity/venda futura não é caixa até se realizar).
  const capitalReciclavelPotencial = calcularCapitalReciclavel(veiculosFrotaAtual, cenario.venda_custos_pct, hoje).totalLiquido;
  const capitalParaAquisicao = cenario.capital_disponivel * mult.fracaoCapitalUsavel;
  const reservaAplicada = cenario.reserva_minima * mult.multiplicadorReserva;
  const custoMinimoParaComprar = cenario.entrada_por_veiculo + reservaAplicada;

  // Capacidade estática: quantos veículos cabem de uma vez, comprados no mês 0. O loop só compra
  // enquanto sobra >= entrada + reserva — nunca deixa o caixa remanescente abaixo da reserva
  // aplicada (validado explicitamente no cenário de teste do Carlos: capital 100k / reserva 30k /
  // entrada 36k não pode gerar saldo negativo).
  let veiculosAdicionados = 0;
  let caixaRestante = capitalParaAquisicao;
  while (caixaRestante >= custoMinimoParaComprar) {
    caixaRestante -= cenario.entrada_por_veiculo;
    veiculosAdicionados += 1;
  }
  const caixaRestanteInicial = caixaRestante;

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
  let caixaOperacionalAcumulado = 0;
  let mesEmQueProximoVeiculoCabe: number | null = null;

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

    // [Fase 1.1] Fluxo de caixa livre do mês (o que sobra depois de pagar a parcela) — negativo
    // se a parcela+despesa superar a receita. Acumulado desde o mês 0.
    const fluxoLivreMensal = receitaIncremental - despesaOperacionalIncremental - parcelasIncrementais;
    caixaOperacionalAcumulado += fluxoLivreMensal;

    // Venda programada (seção 13 do brief original): credita o valor líquido no caixa
    // operacional acumulado no mês configurado.
    if (cenario.venda_programada_mes === mes && cenario.venda_valor_estimado !== null) {
      const custosVenda = cenario.venda_valor_estimado * (cenario.venda_custos_pct / 100);
      caixaOperacionalAcumulado += cenario.venda_valor_estimado - custosVenda;
    }

    // [Fase 1.1] Próximo marco: primeiro mês em que (sobra inicial + caixa operacional já
    // acumulado) cobre a entrada + reserva de mais 1 veículo. Só primeira ocorrência conta.
    if (mesEmQueProximoVeiculoCabe === null && caixaRestanteInicial + caixaOperacionalAcumulado >= custoMinimoParaComprar) {
      mesEmQueProximoVeiculoCabe = mes;
    }

    meses.push({
      mes,
      veiculosNovos: veiculosAdicionados,
      compradosNoMes: mes === 0 ? veiculosAdicionados : 0,
      caixaDisponivelParaAquisicao: caixaRestanteInicial,
      receitaIncremental,
      despesaIncremental: despesaOperacionalIncremental,
      parcelasIncrementais,
      caixaOperacionalAcumulado,
      saldoDevedorIncremental,
      valorFrotaIncremental,
      equityIncremental,
      patrimonioTotalIncremental: caixaOperacionalAcumulado + equityIncremental,
      dscr,
      statusDscr,
    });
  }

  const proximoMarco: ProximoMarco =
    mesEmQueProximoVeiculoCabe !== null
      ? { possivel: true, mesesAteProximoVeiculo: mesEmQueProximoVeiculoCabe }
      : { possivel: false, motivo: 'Não há capital suficiente nas premissas atuais dentro do horizonte configurado.' };

  return {
    estrategia,
    meses,
    veiculosAdicionadosTotal: veiculosAdicionados,
    capitalUsadoTotal: veiculosAdicionados * cenario.entrada_por_veiculo,
    capitalDisponivelParaAquisicao: capitalParaAquisicao,
    reservaMinimaAplicada: reservaAplicada,
    capitalReciclavelPotencial,
    parcelaMensalPorVeiculo,
    valorFinanciadoPorVeiculo,
    avisoCapitalInsuficienteParaUmVeiculo: veiculosAdicionados === 0,
    proximoMarco,
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
