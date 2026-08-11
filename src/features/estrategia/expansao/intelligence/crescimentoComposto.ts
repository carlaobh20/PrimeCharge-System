import { calcularParcelaPrice, gerarTabelaAmortizacao, type LinhaAmortizacao } from '@/shared/lib/amortizacao';
import { SEMANAS_POR_MES } from '../../intelligence/simulacaoEmpresarial';
import { ESTRATEGIAS } from './estrategias';
import type {
  CenarioExpansao,
  EstrategiaExpansao,
  EventoCrescimento,
  HorizonteCrescimento,
  MesCrescimento,
  ProximoVeiculoProjetado,
  ResultadoCrescimentoComposto,
  VeiculoProjetado,
} from '../types';

// Épico 9 — Motor de Expansão, Fase 2 (Crescimento Composto, 2026-08-11). A Fase 1
// (intelligence/motor.ts) responde "quantos veículos cabem AGORA" — capacidade estática, 1 lote
// comprado no mês 0. Esta Fase 2 responde "como a frota evolui reciclando o próprio resultado
// operacional e produto de venda em novas compras" — mês a mês, comprando/vendendo veículos
// PROJETADOS (nunca escritos em `veiculos`, seção 8 do brief) enquanto a estratégia permitir.
//
// Reaproveita sem duplicar: calcularParcelaPrice/gerarTabelaAmortizacao (shared/lib/amortizacao,
// mesmo motor da Fase 1 e do financiamento real), SEMANAS_POR_MES (Épico 3), ESTRATEGIAS (mesmos
// 3 parâmetros visíveis da Fase 1 — nenhum multiplicador novo escondido).
//
// Escopo desta implementação (autorizado explicitamente pelo Carlos, seção 2 do brief da Fase 2):
// só os métodos 'caixa_operacional' e 'caixa_e_venda' estão implementados. 'caixa_aporte' é
// recusado abaixo — não existe simulação de novo aporte externo nesta fase (fica pra Fase 3).
//
// Convenção mantida da Fase 1: só a frota PROJETADA (comprada dentro desta simulação) é
// projetada mês a mês. A frota real já existente na empresa entra só como ponto de partida do
// caixa disponível (via useEstadoRealFrota, no componente) — a amortização/venda dos veículos
// reais não é simulada aqui (mesma nota da Fase 1: "não é projetada para o futuro nesta fase").

const EPS = 1e-6;

export function calcularCrescimentoComposto(
  cenario: CenarioExpansao,
  estrategia: EstrategiaExpansao,
  horizonte: HorizonteCrescimento
): ResultadoCrescimentoComposto {
  if (cenario.metodo_crescimento === 'caixa_aporte') {
    throw new Error(
      'Método "caixa + venda + novo aporte" ainda não foi implementado (Fase 2 só cobre caixa operacional e venda programada). Escolha outro método.'
    );
  }

  const mult = ESTRATEGIAS[estrategia];
  const permiteVenda = cenario.metodo_crescimento === 'caixa_e_venda' && cenario.vender_apos_meses !== null && cenario.valor_venda_por_veiculo !== null;

  const capitalInicialAquisicao = cenario.capital_disponivel * mult.fracaoCapitalUsavel;
  const reservaAplicada = cenario.reserva_minima * mult.multiplicadorReserva;
  const custoMinimoParaComprar = cenario.entrada_por_veiculo + reservaAplicada;

  const valorFinanciadoPorVeiculo = Math.max(0, cenario.preco_veiculo - cenario.entrada_por_veiculo);
  const tabelaPadrao = gerarTabelaAmortizacao(valorFinanciadoPorVeiculo, cenario.taxa_juros_am_pct, cenario.prazo_financiamento_meses, cenario.sistema_amortizacao);
  const parcelaPrimeiraMensal = calcularParcelaPrice(valorFinanciadoPorVeiculo, cenario.taxa_juros_am_pct, cenario.prazo_financiamento_meses);

  const aluguelMensalPorVeiculo = cenario.aluguel_semanal_por_veiculo * SEMANAS_POR_MES;
  const ocupacao = cenario.ocupacao_pct / 100;
  const ipvaMensalPorVeiculo = cenario.ipva_anual_por_veiculo / 12;
  const custoOperacionalUnitario =
    cenario.seguro_mensal_por_veiculo + ipvaMensalPorVeiculo + cenario.rastreador_mensal_por_veiculo + cenario.manutencao_por_km * cenario.km_mensal_por_veiculo;
  const receitaUnitaria = aluguelMensalPorVeiculo * ocupacao;

  const veiculos: VeiculoProjetado[] = [];
  const tabelasPorVeiculo = new Map<number, LinhaAmortizacao[]>();
  const eventos: EventoCrescimento[] = [];
  const meses: MesCrescimento[] = [];

  let caixaExpansao = 0;
  let proximoNumero = 1;
  let ultimoMotivoBloqueio: 'reserva_insuficiente' | 'limite_de_divida' | null = null;

  function parcelaAtivaNoMes(v: VeiculoProjetado, mesReferencia: number): { juros: number; amortizacao: number; parcela: number } {
    const tabela = tabelasPorVeiculo.get(v.numero) ?? tabelaPadrao;
    const r = mesReferencia - v.mesCompra;
    if (r < 1 || r > tabela.length) return { juros: 0, amortizacao: 0, parcela: 0 };
    const linha = tabela[r - 1];
    return { juros: linha.juros, amortizacao: linha.amortizacao, parcela: linha.parcela };
  }

  function saldoDevedorAntes(v: VeiculoProjetado, mesReferencia: number): number {
    const tabela = tabelasPorVeiculo.get(v.numero) ?? tabelaPadrao;
    const r = mesReferencia - v.mesCompra;
    if (r <= 1) return valorFinanciadoPorVeiculo;
    if (r - 2 >= tabela.length) return 0;
    return tabela[r - 2].saldoDevedor;
  }

  // Seção 6/30 — regra explícita de expansão: nunca "cabe, então compra" sem checar (1) reserva
  // mínima da estratégia e (2) capacidade de dívida projetada (DSCR do próximo mês, incluindo o
  // veículo novo, não pode furar dscr_minimo_atencao do cenário). Loop compra quanto couber no
  // mesmo mês (pode ser >1), cada compra decrementando o caixa — sempre termina porque entrada > 0.
  function tentarComprar(mes: number, veiculosAtivos: VeiculoProjetado[]) {
    for (;;) {
      if (caixaExpansao + EPS < custoMinimoParaComprar) {
        if (ultimoMotivoBloqueio !== 'reserva_insuficiente') {
          eventos.push({
            mes,
            tipo: 'compra_bloqueada',
            veiculoNumero: proximoNumero,
            motivoBloqueio: 'reserva_insuficiente',
            descricao: `Caixa disponível (${fmt(caixaExpansao)}) não cobre entrada + reserva mínima (${fmt(custoMinimoParaComprar)}).`,
            numeros: { caixaDisponivel: caixaExpansao, entradaNecessaria: cenario.entrada_por_veiculo, reservaMinima: reservaAplicada, gap: custoMinimoParaComprar - caixaExpansao },
          });
          ultimoMotivoBloqueio = 'reserva_insuficiente';
        }
        return;
      }

      const parcelasAtivasProjetadas = veiculosAtivos.reduce((soma, v) => soma + parcelaAtivaNoMes(v, mes + 1).parcela, 0);
      const noiAtual = veiculosAtivos.length * (receitaUnitaria - custoOperacionalUnitario) - cenario.contador_mensal;
      const noiProjetado = noiAtual + (receitaUnitaria - custoOperacionalUnitario);
      const parcelasProjetadas = parcelasAtivasProjetadas + parcelaPrimeiraMensal;
      const dscrProjetado = parcelasProjetadas > 0 ? noiProjetado / parcelasProjetadas : null;

      if (dscrProjetado !== null && dscrProjetado < cenario.dscr_minimo_atencao) {
        if (ultimoMotivoBloqueio !== 'limite_de_divida') {
          eventos.push({
            mes,
            tipo: 'compra_bloqueada',
            veiculoNumero: proximoNumero,
            motivoBloqueio: 'limite_de_divida',
            descricao: `DSCR projetado do próximo mês com este veículo (${dscrProjetado.toFixed(2)}×) ficaria abaixo do mínimo de atenção (${cenario.dscr_minimo_atencao.toFixed(2)}×). Caixa disponível, mas a dívida bloqueia.`,
            numeros: { dscrProjetado, dscrMinimoAtencao: cenario.dscr_minimo_atencao, parcelasProjetadas, noiProjetado },
          });
          ultimoMotivoBloqueio = 'limite_de_divida';
        }
        return;
      }

      const numero = proximoNumero++;
      const tabela = gerarTabelaAmortizacao(valorFinanciadoPorVeiculo, cenario.taxa_juros_am_pct, cenario.prazo_financiamento_meses, cenario.sistema_amortizacao);
      tabelasPorVeiculo.set(numero, tabela);
      const veiculo: VeiculoProjetado = { numero, mesCompra: mes, precoCompra: cenario.preco_veiculo, entrada: cenario.entrada_por_veiculo, valorFinanciado: valorFinanciadoPorVeiculo, vendidoNoMes: null };
      veiculos.push(veiculo);
      veiculosAtivos.push(veiculo);
      caixaExpansao -= cenario.entrada_por_veiculo;
      ultimoMotivoBloqueio = null;

      eventos.push({
        mes,
        tipo: 'compra_autorizada',
        veiculoNumero: numero,
        descricao: `Veículo #${numero} comprado. Caixa disponível ${fmt(caixaExpansao + cenario.entrada_por_veiculo)}, entrada ${fmt(cenario.entrada_por_veiculo)}, reserva mínima ${fmt(reservaAplicada)} preservada.`,
        numeros: { caixaAntes: caixaExpansao + cenario.entrada_por_veiculo, entrada: cenario.entrada_por_veiculo, caixaDepois: caixaExpansao, reservaMinima: reservaAplicada },
      });
    }
  }

  for (let mes = 0; mes <= horizonte; mes++) {
    if (mes === 0) caixaExpansao = capitalInicialAquisicao;

    const veiculosAtivos = veiculos.filter((v) => v.vendidoNoMes === null);
    const caixaInicial = caixaExpansao;

    // 1) Vendas programadas deste mês (seção 11/13) — proventos entram no caixa ANTES da
    // tentativa de compra do mesmo mês, permitindo reciclagem imediata (venda → caixa → compra
    // no mesmo mês, se der).
    let produtoLiquidoVendas = 0;
    let veiculosVendidosNoMes = 0;
    if (permiteVenda) {
      for (const v of [...veiculosAtivos]) {
        const r = mes - v.mesCompra;
        if (r === cenario.vender_apos_meses) {
          const saldoDevedor = saldoDevedorAntes(v, mes);
          const custosVenda = cenario.valor_venda_por_veiculo! * (cenario.venda_custos_pct / 100);
          const liquido = Math.max(0, cenario.valor_venda_por_veiculo! - saldoDevedor - custosVenda);
          v.vendidoNoMes = mes;
          caixaExpansao += liquido;
          produtoLiquidoVendas += liquido;
          veiculosVendidosNoMes += 1;
          veiculosAtivos.splice(veiculosAtivos.indexOf(v), 1);
          eventos.push({
            mes,
            tipo: 'venda',
            veiculoNumero: v.numero,
            descricao: `Veículo #${v.numero} vendido por ${fmt(cenario.valor_venda_por_veiculo!)}. Saldo devedor quitado ${fmt(saldoDevedor)}, custos de venda ${fmt(custosVenda)}. Capital líquido reciclado: ${fmt(liquido)}.`,
            numeros: { valorVenda: cenario.valor_venda_por_veiculo!, saldoDevedor, custosVenda, liquido },
          });
        }
      }
    }

    // 2) Tenta comprar com o caixa já atualizado pela venda deste mês.
    tentarComprar(mes, veiculosAtivos);

    // 3) Operação do mês — usa a frota já pós-venda/pós-compra (novo veículo já gera receita no
    // próprio mês da compra, mesma convenção da Fase 1; sua 1ª parcela só vence no mês seguinte,
    // porque a tabela de amortização é 1-indexada a partir do mês da compra).
    const receita = veiculosAtivos.length * receitaUnitaria;
    const custosOperacionais = veiculosAtivos.length * custoOperacionalUnitario + cenario.contador_mensal;
    let jurosDoMes = 0;
    let amortizacaoDoMes = 0;
    let parcelasDoMes = 0;
    for (const v of veiculosAtivos) {
      const { juros, amortizacao, parcela } = parcelaAtivaNoMes(v, mes);
      jurosDoMes += juros;
      amortizacaoDoMes += amortizacao;
      parcelasDoMes += parcela;
    }

    const fluxoDeCaixa = receita - custosOperacionais - parcelasDoMes;
    caixaExpansao += fluxoDeCaixa;

    const dividaTotal = veiculosAtivos.reduce((soma, v) => soma + saldoDevedorNoFimDoMes(v, mes, tabelasPorVeiculo, tabelaPadrao, valorFinanciadoPorVeiculo), 0);
    const equityTotal = veiculosAtivos.length * cenario.preco_veiculo - dividaTotal;
    const noiDoMes = receita - custosOperacionais;
    const dscr = parcelasDoMes > 0 ? noiDoMes / parcelasDoMes : null;

    meses.push({
      mes,
      frotaTotal: veiculosAtivos.length,
      veiculosComprados: veiculos.filter((v) => v.mesCompra === mes).length,
      veiculosVendidos: veiculosVendidosNoMes,
      caixaInicial,
      receita,
      custosOperacionais,
      jurosDoMes,
      amortizacaoDoMes,
      fluxoDeCaixa,
      produtoLiquidoVendas,
      caixaFinal: caixaExpansao,
      dividaTotal,
      equityTotal,
      patrimonioLiquido: caixaExpansao + equityTotal,
      dscr,
    });
  }

  const mesInicial = meses[0];
  const mesFinal = meses[meses.length - 1];
  const receitaAcumulada = meses.reduce((s, m) => s + m.receita, 0);
  const fluxoDeCaixaAcumulado = meses.reduce((s, m) => s + m.fluxoDeCaixa, 0);
  const patrimonioInicial = mesInicial.patrimonioLiquido;
  const patrimonioFinal = mesFinal.patrimonioLiquido;

  // Seção 25/26 — nesta fase o crescimento é sempre 100% autofinanciado (nenhum aporte externo é
  // simulado); capitalExternoNecessario fica travado em 0 e documentado como tal, não escondido.
  const capitalExternoNecessario = 0;
  const capitalTotalMovimentado = veiculos.reduce((s, v) => s + v.entrada, 0);
  const crescimentoAutofinanciadoPct = capitalTotalMovimentado > 0 ? 100 : null;

  return {
    estrategia,
    horizonte,
    metodo: cenario.metodo_crescimento,
    meses,
    veiculos,
    eventos,
    proximoVeiculo: calcularProximoVeiculo(meses, veiculos.length, cenario, custoMinimoParaComprar, ultimoMotivoBloqueio, horizonte),
    frotaInicial: mesInicial.frotaTotal,
    frotaFinal: mesFinal.frotaTotal,
    veiculosCompradosTotal: veiculos.length,
    veiculosVendidosTotal: veiculos.filter((v) => v.vendidoNoMes !== null).length,
    receitaAcumulada,
    fluxoDeCaixaAcumulado,
    dividaFinal: mesFinal.dividaTotal,
    equityFinal: mesFinal.equityTotal,
    caixaFinal: mesFinal.caixaFinal,
    patrimonioFinal,
    patrimonioInicial,
    crescimentoPatrimonialPct: patrimonioInicial > EPS ? ((patrimonioFinal - patrimonioInicial) / patrimonioInicial) * 100 : null,
    capitalExternoNecessario,
    crescimentoAutofinanciadoPct,
  };
}

/** Executa as 3 estratégias sobre o mesmo cenário — tabela de comparação da seção 24. */
export function compararCrescimentoComposto(
  cenario: CenarioExpansao,
  horizonte: HorizonteCrescimento
): Record<EstrategiaExpansao, ResultadoCrescimentoComposto> {
  return {
    conservadora: calcularCrescimentoComposto(cenario, 'conservadora', horizonte),
    balanceada: calcularCrescimentoComposto(cenario, 'balanceada', horizonte),
    agressiva: calcularCrescimentoComposto(cenario, 'agressiva', horizonte),
  };
}

function saldoDevedorNoFimDoMes(
  v: VeiculoProjetado,
  mes: number,
  tabelasPorVeiculo: Map<number, LinhaAmortizacao[]>,
  tabelaPadrao: LinhaAmortizacao[],
  valorFinanciado: number
): number {
  const tabela = tabelasPorVeiculo.get(v.numero) ?? tabelaPadrao;
  const r = mes - v.mesCompra;
  if (r < 1) return valorFinanciado;
  if (r > tabela.length) return 0;
  return tabela[r - 1].saldoDevedor;
}

// Seção 19 — "Próximo Veículo": estimativa (não certeza) de quando o próximo veículo caberia
// além do horizonte simulado, projetando linearmente o fluxo de caixa médio dos últimos meses.
// Marcado como ESTIMATIVA na interface — não é o mesmo tipo de garantia que um mês já simulado.
function calcularProximoVeiculo(
  meses: MesCrescimento[],
  veiculosComprados: number,
  cenario: CenarioExpansao,
  custoMinimoParaComprar: number,
  ultimoMotivoBloqueio: 'reserva_insuficiente' | 'limite_de_divida' | null,
  horizonte: number
): ProximoVeiculoProjetado {
  const ultimoMes = meses[meses.length - 1];
  const numero = veiculosComprados + 1;
  const capitalDisponivelProjetado = ultimoMes.caixaFinal;
  const gap = Math.max(0, custoMinimoParaComprar - capitalDisponivelProjetado);

  if (gap <= EPS) {
    return { possivel: true, numero, mesEstimado: horizonte, capitalNecessario: custoMinimoParaComprar, capitalDisponivelProjetado };
  }

  const janela = meses.slice(-Math.min(3, meses.length));
  const fluxoMedio = janela.reduce((s, m) => s + m.fluxoDeCaixa, 0) / janela.length;

  if (fluxoMedio <= EPS) {
    const motivo = ultimoMotivoBloqueio === 'limite_de_divida' ? 'limite de dívida' : cenario.metodo_crescimento === 'caixa_operacional' ? 'aguardando caixa operacional' : 'aguardando venda';
    return { possivel: false, motivo, capitalNecessario: custoMinimoParaComprar, capitalDisponivelProjetado, gap };
  }

  const mesesNecessarios = Math.ceil(gap / fluxoMedio);
  return { possivel: true, numero, mesEstimado: horizonte + mesesNecessarios, capitalNecessario: custoMinimoParaComprar, capitalDisponivelProjetado };
}

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
