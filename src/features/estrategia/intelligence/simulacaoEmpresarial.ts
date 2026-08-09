import type { CenarioSimulacaoInput } from '../types';

// Épico 3 — Central de Decisão Empresarial (2026-08-09, reconstrução completa a pedido do
// Carlos — "considere a implementação atual apenas como rascunho"). Este arquivo substitui a
// versão anterior por inteiro: agora rastreia CADA VEÍCULO individualmente (saldo devedor,
// valor depreciado), não só "comprou/não comprou" — sem isso não dá pra responder "quando o
// patrimônio supera a dívida" nem "quanto vale a empresa hoje", que são o coração da Fase 1.
//
// Fase 3 (2026-08-09): o motor passou a agir sobre `amortizacao_estrategia`/`amortizacao_valor_manual`
// (Card 4) — amortização extraordinária, além da parcela normal do financiamento (Price/francesa).
// Ver `calcularValorAmortizacaoExtra` e `aplicarAmortizacaoExtra` abaixo pra semântica de cada
// estratégia.
//
// Continua sendo um simulador de CENÁRIO HIPOTÉTICO, independente do dado real da frota (mesmo
// racional já registrado na v1) — responde "o que estou planejando", a Timeline de Crescimento/
// Capital Allocation Center (dado real) continuam respondendo "o que já aconteceu".

export type DespesaBreakdown = {
  parcelas: number;
  seguro: number;
  ipva: number;
  rastreador: number;
  lavagem: number;
  manutencao: number;
  licenciamento: number;
};

export type MesSimulado = {
  mes: number;
  frota: number;
  caixaDisponivel: number;
  valorTotalFrota: number;
  saldoDevedorTotal: number;
  patrimonioLiquido: number;
  capitalInvestidoAcumulado: number;
  receitaMensal: number;
  despesaMensal: number;
  despesaBreakdown: DespesaBreakdown;
  lucroMensal: number;
  lucroAcumulado: number;
  /** Variação real do caixa no mês — difere do lucro quando o mês inclui a entrada de um veículo comprado (capex) ou amortização extra. */
  fluxoLivreMensal: number;
  /** Amortização extraordinária aplicada neste mês (além da parcela normal) — 0 se a estratégia é 'nunca' ou não se aplicou neste mês específico. */
  amortizacaoExtraMensal: number;
  /** Soma de toda amortização extraordinária desde o mês 0 — o que a estratégia escolhida já tirou de dívida além do cronograma padrão. */
  amortizacaoExtraAcumulada: number;
  /** Parte da parcela normal (Price) que é amortização de principal, não juros — soma de todos os veículos financiados neste mês. Usado no Fluxo Detalhado (Card "ano a ano"). */
  amortizacaoProgramadaMensal: number;
  valorDaEmpresa: number;
  roiAcumuladoPct: number | null;
};

export type SimulacaoResultado = {
  meses: MesSimulado[];
  objetivoAlcancadoNoMes: number | null;
  frotaFinal: number;
  /** true se o capital informado não cobriu nem as entradas dos veículos iniciais pedidos — a compra inicial parou antes do total desejado. */
  avisoCapitalInicialInsuficiente: boolean;
};

type VeiculoSimulado = {
  mesCompra: number;
  valorOriginal: number;
  saldoDevedor: number;
  parcela: number;
};

// Exportada (Fase 3) — o motor de "Momento Ideal de Comprar" (momentoDeCompra.ts) precisa da
// mesma fórmula Price/francesa pra projetar um veículo isolado, sem duplicar a conta aqui.
export function calcularParcela(valorFinanciado: number, taxaAmPct: number, prazoMeses: number): number {
  if (prazoMeses <= 0 || valorFinanciado <= 0) return 0;
  const i = taxaAmPct / 100;
  if (i === 0) return valorFinanciado / prazoMeses;
  return (valorFinanciado * i) / (1 - Math.pow(1 + i, -prazoMeses));
}

export const SEMANAS_POR_MES = 52 / 12;

// Quanto amortizar extraordinariamente ESTE mês, antes de saber se dá pra aplicar (o caller
// ainda limita ao caixa disponível e ao saldo devedor total). 'manual' aplica uma única vez, no
// mês 1 — o schema guarda só um valor escalar (não uma lista de mês→valor), então "manual" aqui
// significa "um aporte extraordinário único, logo no início do horizonte simulado", não uma data
// livre. Se você quiser escolher o mês exato, isso vira um campo novo (me avisa).
function calcularValorAmortizacaoExtra(cenario: CenarioSimulacaoInput, mes: number): number {
  const valorManual = cenario.amortizacao_valor_manual ?? 0;
  switch (cenario.amortizacao_estrategia) {
    case 'todo_mes':
      return mes > 0 ? valorManual : 0;
    case 'a_cada_6_meses':
      return mes > 0 && mes % 6 === 0 ? valorManual : 0;
    case 'manual':
      return mes === 1 ? valorManual : 0;
    case 'quando_sobrar_caixa':
      // Sinalizado pelo caller com Infinity: "amortize o que sobrar" — só faz sentido depois que
      // a frota já atingiu o objetivo (antes disso, "sobra" de caixa é capital de crescimento,
      // não sobra de verdade — reinvestir_lucro já está usando pra comprar veículo).
      return Infinity;
    case 'nunca':
    default:
      return 0;
  }
}

/** Reduz o saldo devedor dos veículos (mais antigos primeiro) até esgotar `valorDisponivel` ou quitar tudo. Retorna o total efetivamente amortizado. */
function aplicarAmortizacaoExtra(veiculos: VeiculoSimulado[], valorDisponivel: number): number {
  let restante = valorDisponivel;
  let totalAmortizado = 0;
  for (const v of veiculos) {
    if (restante <= 0) break;
    if (v.saldoDevedor <= 0) continue;
    const amortizar = Math.min(v.saldoDevedor, restante);
    v.saldoDevedor -= amortizar;
    restante -= amortizar;
    totalAmortizado += amortizar;
  }
  return totalAmortizado;
}

export function simularCrescimentoEmpresarial(cenario: CenarioSimulacaoInput): SimulacaoResultado {
  const parcelaPadrao = calcularParcela(cenario.valor_financiado_por_veiculo, cenario.taxa_juros_am_pct, cenario.prazo_financiamento_meses);
  const custoTotalPorVeiculo = cenario.valor_entrada_por_veiculo + cenario.valor_financiado_por_veiculo;
  const ipvaMensalPorVeiculo = cenario.ipva_anual_por_veiculo / 12;
  const licenciamentoMensalPorVeiculo = cenario.licenciamento_anual_por_veiculo / 12;
  const aluguelMensalPorVeiculo = cenario.aluguel_esperado_semanal_por_veiculo * SEMANAS_POR_MES;
  const ocupacao = cenario.ocupacao_esperada_pct / 100;
  const inadimplencia = cenario.inadimplencia_esperada_pct / 100;
  const depreciacaoAm = cenario.depreciacao_am_pct / 100;

  const veiculos: VeiculoSimulado[] = [];
  let caixaDisponivel = cenario.capital_disponivel;
  let lucroAcumulado = 0;
  let capitalInvestidoAcumulado = 0;
  let amortizacaoExtraAcumulada = 0;

  function comprarVeiculo(mes: number) {
    veiculos.push({
      mesCompra: mes,
      valorOriginal: custoTotalPorVeiculo,
      saldoDevedor: cenario.valor_financiado_por_veiculo,
      parcela: parcelaPadrao,
    });
    caixaDisponivel -= cenario.valor_entrada_por_veiculo;
    capitalInvestidoAcumulado += custoTotalPorVeiculo;
  }

  const veiculosIniciaisDesejados = Math.min(cenario.veiculos_iniciais, cenario.objetivo_veiculos);
  let avisoCapitalInicialInsuficiente = false;
  for (let n = 0; n < veiculosIniciaisDesejados; n++) {
    if (caixaDisponivel < cenario.valor_entrada_por_veiculo) {
      avisoCapitalInicialInsuficiente = true;
      break;
    }
    comprarVeiculo(0);
  }

  const meses: MesSimulado[] = [];
  let objetivoAlcancadoNoMes: number | null = veiculos.length >= cenario.objetivo_veiculos ? 0 : null;

  for (let mes = 0; mes <= cenario.prazo_desejado_meses; mes++) {
    let parcelasDoMes = 0;
    let amortizacaoProgramadaDoMes = 0;
    for (const v of veiculos) {
      if (v.saldoDevedor <= 0) continue;
      const juros = v.saldoDevedor * (cenario.taxa_juros_am_pct / 100);
      const amortizacaoDaParcela = Math.min(v.parcela - juros, v.saldoDevedor);
      const parcelaCobrada = Math.min(v.parcela, v.saldoDevedor + juros);
      v.saldoDevedor = Math.max(0, v.saldoDevedor - amortizacaoDaParcela);
      parcelasDoMes += parcelaCobrada;
      amortizacaoProgramadaDoMes += amortizacaoDaParcela;
    }

    const frota = veiculos.length;
    const receitaMensal = frota * aluguelMensalPorVeiculo * ocupacao * (1 - inadimplencia);
    const despesaBreakdown: DespesaBreakdown = {
      parcelas: parcelasDoMes,
      seguro: frota * cenario.seguro_mensal_por_veiculo,
      ipva: frota * ipvaMensalPorVeiculo,
      rastreador: frota * cenario.rastreador_mensal_por_veiculo,
      lavagem: frota * cenario.lavagem_mensal_por_veiculo,
      manutencao: frota * cenario.manutencao_mensal_por_veiculo,
      licenciamento: frota * licenciamentoMensalPorVeiculo,
    };
    const despesaMensal = Object.values(despesaBreakdown).reduce((a, b) => a + b, 0);
    const lucroMensal = receitaMensal - despesaMensal;
    lucroAcumulado += lucroMensal;

    const caixaAntesDoMes = caixaDisponivel;

    if (cenario.reinvestir_lucro) {
      caixaDisponivel += lucroMensal;
    }

    if (mes > 0) {
      while (veiculos.length < cenario.objetivo_veiculos && caixaDisponivel >= cenario.valor_entrada_por_veiculo) {
        comprarVeiculo(mes);
      }
    }

    // Amortização extraordinária (Card 4) — depois de tentar crescer a frota, pra não competir
    // com a compra de veículo no mesmo caixa. 'quando_sobrar_caixa' só age depois que a frota já
    // atingiu o objetivo (antes disso, "sobra" é capital de crescimento represado, não sobra real).
    let amortizacaoExtraMensal = 0;
    if (mes > 0 && caixaDisponivel > 0) {
      let valorAlvo = calcularValorAmortizacaoExtra(cenario, mes);
      if (valorAlvo === Infinity) {
        valorAlvo = veiculos.length >= cenario.objetivo_veiculos ? caixaDisponivel : 0;
      }
      if (valorAlvo > 0) {
        amortizacaoExtraMensal = aplicarAmortizacaoExtra(veiculos, Math.min(valorAlvo, caixaDisponivel));
        caixaDisponivel -= amortizacaoExtraMensal;
      }
    }
    amortizacaoExtraAcumulada += amortizacaoExtraMensal;

    const fluxoLivreMensal = caixaDisponivel - caixaAntesDoMes;

    let valorTotalFrota = 0;
    let saldoDevedorTotal = 0;
    for (const v of veiculos) {
      const mesesDesdeCompra = mes - v.mesCompra;
      valorTotalFrota += v.valorOriginal * Math.pow(1 - depreciacaoAm, mesesDesdeCompra);
      saldoDevedorTotal += v.saldoDevedor;
    }
    const patrimonioLiquido = valorTotalFrota - saldoDevedorTotal;
    const roiAcumuladoPct = capitalInvestidoAcumulado > 0 ? (lucroAcumulado / capitalInvestidoAcumulado) * 100 : null;

    meses.push({
      mes,
      frota,
      caixaDisponivel,
      valorTotalFrota,
      saldoDevedorTotal,
      patrimonioLiquido,
      capitalInvestidoAcumulado,
      receitaMensal,
      despesaMensal,
      despesaBreakdown,
      lucroMensal,
      lucroAcumulado,
      fluxoLivreMensal,
      amortizacaoExtraMensal,
      amortizacaoExtraAcumulada,
      amortizacaoProgramadaMensal: amortizacaoProgramadaDoMes,
      valorDaEmpresa: caixaDisponivel + patrimonioLiquido,
      roiAcumuladoPct,
    });

    if (objetivoAlcancadoNoMes === null && frota >= cenario.objetivo_veiculos) {
      objetivoAlcancadoNoMes = mes;
    }
  }

  return {
    meses,
    objetivoAlcancadoNoMes,
    frotaFinal: veiculos.length,
    avisoCapitalInicialInsuficiente,
  };
}
