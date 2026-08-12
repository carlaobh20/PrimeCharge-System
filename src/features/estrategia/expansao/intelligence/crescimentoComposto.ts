import { calcularParcelaPrice, gerarTabelaAmortizacao, type LinhaAmortizacao } from '@/shared/lib/amortizacao';
import { calcularResumoFinanciamentoReal } from '@/features/frota/intelligence';
import { resolverValorAtualVeiculo } from '@/shared/lib/valorAtivo';
import { calcularReceitaMensalEquivalente } from '@/shared/lib/receitaContrato';
import { SEMANAS_POR_MES } from '../../intelligence/simulacaoEmpresarial';
import { ESTRATEGIAS } from './estrategias';
import { avaliarCapacidadeDeCompra } from './capacidadeDeCompra';
import type { Veiculo } from '@/features/frota/types';
import type { Contrato } from '@/features/contracts/types';
import type {
  CenarioExpansao,
  EstrategiaExpansao,
  EventoCrescimento,
  HorizonteCrescimento,
  MesCrescimento,
  ProximoVeiculoProjetado,
  ResultadoCrescimentoComposto,
  VeiculoProjetado,
  VeiculoRealParaProjecao,
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
// Fase 2.1, Parte 2 (2026-08-11) — MUDANÇA em relação à Fase 2: a frota REAL já existente na
// empresa agora entra na simulação desde o mês 0, não só como número agregado de caixa. Cada
// veículo real continua sendo simulado mês a mês com a PRÓPRIA tabela de amortização real
// (calcularResumoFinanciamentoReal — não a tabela hipotética do cenário) e a PRÓPRIA receita real
// (contrato ativo, se houver). Isso fecha as limitações #1 e #2 do relatório da Fase 2: "frota
// real não entra na projeção" e "DSCR usa aproximação". O que NÃO muda: veículos reais nunca são
// "comprados" ou "vendidos" por este motor — só os PROJETADOS (origem: 'projetado') entram no
// audit trail de compra/venda e no `resultado.veiculos` retornado.

const EPS = 1e-6;

/**
 * Fase 2.1, Parte 2 — monta a frota real no formato que o motor de crescimento consome.
 * Reaproveita sem duplicar: calcularResumoFinanciamentoReal (frota/intelligence, dívida exata),
 * resolverValorAtualVeiculo (shared/lib, mercado→FIPE→compra), calcularReceitaMensalEquivalente
 * (shared/lib, mesmo cálculo do Yield do Ativo). Nenhuma tabela nova, nenhum cálculo de negócio
 * novo — só reconstrói o que já existe no formato que `calcularCrescimentoComposto` precisa.
 *
 * Exclui veículos com status 'encerrado' (mesma convenção de calcularEstadoRealFrota — não fazem
 * mais parte da frota ativa da empresa).
 */
export function construirFrotaRealParaProjecao(
  veiculos: Veiculo[],
  contratosAtivos: Pick<Contrato, 'veiculo_id' | 'valor_periodico' | 'periodicidade'>[],
  hoje: Date = new Date()
): VeiculoRealParaProjecao[] {
  return veiculos
    .filter((v) => v.status !== 'encerrado')
    .map((veiculo) => {
      const resumoFinanciamento = calcularResumoFinanciamentoReal(veiculo, hoje);
      const contratoAtivo = contratosAtivos.find((c) => c.veiculo_id === veiculo.id);

      return {
        veiculoId: veiculo.id,
        identificador: veiculo.placa,
        tabela: resumoFinanciamento?.tabela ?? [],
        mesesDecorridos: resumoFinanciamento?.mesesDecorridos ?? 0,
        saldoDevedorAtual: resumoFinanciamento && !resumoFinanciamento.quitado ? resumoFinanciamento.saldoDevedorAtual : 0,
        valorAtual: resolverValorAtualVeiculo(veiculo),
        receitaMensalReal: contratoAtivo ? calcularReceitaMensalEquivalente(contratoAtivo.valor_periodico, contratoAtivo.periodicidade) : 0,
      };
    });
}

export function calcularCrescimentoComposto(
  cenario: CenarioExpansao,
  estrategia: EstrategiaExpansao,
  horizonte: HorizonteCrescimento,
  frotaReal: VeiculoRealParaProjecao[] = []
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

  // `veiculosComprados` é só o que ESTA simulação compra (retornado em `resultado.veiculos`,
  // mesma semântica da Fase 2 — nunca inclui frota real). `frotaCompleta` é o conjunto de
  // trabalho mês a mês: começa com a frota real (Fase 2.1) e cresce com cada compra.
  const veiculosComprados: VeiculoProjetado[] = [];
  const tabelasPorVeiculo = new Map<number, LinhaAmortizacao[]>();
  const eventos: EventoCrescimento[] = [];
  const meses: MesCrescimento[] = [];

  // Cada veículo real "entra" na simulação como se tivesse sido comprado no mês 0 (mesmo grau
  // de graça de 1 mês que um veículo projetado tem no mês da própria compra — zero parcela em
  // mesReferencia=0, primeira parcela simulada só em mesReferencia=1), mas com a tabela JÁ
  // FATIADA a partir da parcela seguinte à última paga de verdade (mesesDecorridos). É isso que
  // faz a parcela nº mesesDecorridos+1 (a próxima que realmente vai vencer) cair exatamente em
  // mesReferencia=1 — sem recontar nenhuma parcela que o veículo já pagou antes de hoje.
  const frotaCompleta: VeiculoProjetado[] = frotaReal.map((vr, idx) => {
    const numero = -(idx + 1); // negativo — nunca colide com proximoNumero (sempre >= 1)
    tabelasPorVeiculo.set(numero, vr.tabela.slice(vr.mesesDecorridos));
    return {
      numero,
      origem: 'real',
      identificador: vr.identificador,
      mesCompra: 0,
      precoCompra: 0,
      entrada: 0,
      valorFinanciado: vr.saldoDevedorAtual,
      vendidoNoMes: null,
      receitaMensal: vr.receitaMensalReal,
      custoOperacionalMensal: custoOperacionalUnitario,
      valorAtual: vr.valorAtual,
    };
  });

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

  // Só chamada para veículos origem 'projetado' (venda programada nunca vende frota real nesta
  // fase — ver loop de vendas abaixo) — por isso pode seguir usando o financiamento hipotético
  // do cenário como piso do "antes da 1ª parcela", sem precisar de v.valorFinanciado aqui.
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
  //
  // Fase 3.2 (Épico 10, 2026-08-12) — o gate em si (reserva, depois DSCR) foi extraído pra
  // `avaliarCapacidadeDeCompra` (capacidadeDeCompra.ts), a mesma função que `cicloDeVenda.ts` e
  // `comparadorMomentosDeVenda.ts` agora chamam (fonte única — auditoria
  // `relatorio-epico10-fase3.1-auditoria-2026-08-12.md`). O que fica só aqui: como montar
  // `noiAtual`/`parcelasAtivasProjetadas` a partir da frota REAL por veículo (Fase 2.1) e o
  // desconto de `contador_mensal` — específico do modelo do Épico 9, a função compartilhada não
  // sabe disso, só recebe o NOI já pronto. `epsilonCaixa: EPS` (1e-6) preserva a tolerância
  // exata já validada deste motor (os outros 2 arquivos usam 1, o default da função).
  function tentarComprar(mes: number, veiculosAtivos: VeiculoProjetado[]) {
    for (;;) {
      const parcelasAtivasProjetadas = veiculosAtivos.reduce((soma, v) => soma + parcelaAtivaNoMes(v, mes + 1).parcela, 0);
      // Fase 2.1 — NOI por veículo (não mais uniforme): cada veículo real contribui sua própria
      // receita real (contrato ativo, ou 0) menos a mesma premissa de custo operacional; isso é
      // o que torna o DSCR de compra sensível à frota real de verdade, não só à projetada.
      const noiAtual = veiculosAtivos.reduce((soma, v) => soma + (v.receitaMensal - v.custoOperacionalMensal), 0) - cenario.contador_mensal;
      const resultado = avaliarCapacidadeDeCompra({
        caixa: caixaExpansao,
        entrada: cenario.entrada_por_veiculo,
        reservaMinima: reservaAplicada,
        noiAtual,
        noiMarginalCandidato: receitaUnitaria - custoOperacionalUnitario,
        parcelasAtivasProjetadas,
        parcelaCandidato: parcelaPrimeiraMensal,
        dscrMinimoAtencao: cenario.dscr_minimo_atencao,
        epsilonCaixa: EPS,
      });

      if (!resultado.pode) {
        if (resultado.motivo === 'reserva') {
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
        } else {
          if (ultimoMotivoBloqueio !== 'limite_de_divida') {
            const noiProjetado = noiAtual + (receitaUnitaria - custoOperacionalUnitario);
            const parcelasProjetadas = parcelasAtivasProjetadas + parcelaPrimeiraMensal;
            eventos.push({
              mes,
              tipo: 'compra_bloqueada',
              veiculoNumero: proximoNumero,
              motivoBloqueio: 'limite_de_divida',
              descricao: `DSCR projetado do próximo mês com este veículo (${resultado.dscrProjetado.toFixed(2)}×) ficaria abaixo do mínimo de atenção (${cenario.dscr_minimo_atencao.toFixed(2)}×). Caixa disponível, mas a dívida bloqueia.`,
              numeros: { dscrProjetado: resultado.dscrProjetado, dscrMinimoAtencao: cenario.dscr_minimo_atencao, parcelasProjetadas, noiProjetado },
            });
            ultimoMotivoBloqueio = 'limite_de_divida';
          }
        }
        return;
      }

      const numero = proximoNumero++;
      const tabela = gerarTabelaAmortizacao(valorFinanciadoPorVeiculo, cenario.taxa_juros_am_pct, cenario.prazo_financiamento_meses, cenario.sistema_amortizacao);
      tabelasPorVeiculo.set(numero, tabela);
      const veiculo: VeiculoProjetado = {
        numero,
        origem: 'projetado',
        identificador: null,
        mesCompra: mes,
        precoCompra: cenario.preco_veiculo,
        entrada: cenario.entrada_por_veiculo,
        valorFinanciado: valorFinanciadoPorVeiculo,
        vendidoNoMes: null,
        receitaMensal: receitaUnitaria,
        custoOperacionalMensal: custoOperacionalUnitario,
        valorAtual: cenario.preco_veiculo,
      };
      veiculosComprados.push(veiculo);
      frotaCompleta.push(veiculo);
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

    const veiculosAtivos = frotaCompleta.filter((v) => v.vendidoNoMes === null);
    const caixaInicial = caixaExpansao;

    // 1) Vendas programadas deste mês (seção 11/13) — proventos entram no caixa ANTES da
    // tentativa de compra do mesmo mês, permitindo reciclagem imediata (venda → caixa → compra
    // no mesmo mês, se der). Fase 2.1: nunca vende frota real (`origem === 'real'`) — este motor
    // só compra/vende os veículos que ele mesmo projeta.
    let produtoLiquidoVendas = 0;
    let veiculosVendidosNoMes = 0;
    if (permiteVenda) {
      for (const v of [...veiculosAtivos]) {
        if (v.origem !== 'projetado') continue;
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
    // porque a tabela de amortização é 1-indexada a partir do mês da compra). Fase 2.1: receita e
    // custo agora são somados por veículo (cada um com seu próprio valor), não mais
    // `quantidade × valor uniforme` — é isso que permite um veículo real com contrato ativo
    // contribuir sua receita de verdade, e um real sem contrato contribuir R$ 0 de verdade.
    const receita = veiculosAtivos.reduce((soma, v) => soma + v.receitaMensal, 0);
    const custosOperacionais = veiculosAtivos.reduce((soma, v) => soma + v.custoOperacionalMensal, 0) + cenario.contador_mensal;
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

    const dividaTotal = veiculosAtivos.reduce((soma, v) => soma + saldoDevedorNoFimDoMes(v, mes, tabelasPorVeiculo, tabelaPadrao), 0);
    // Fase 2.1 — valor da frota agora vem de v.valorAtual (preco_veiculo fixo para projetado,
    // resolverValorAtualVeiculo para real). Veículo real sem valor conhecido (null) não soma
    // aqui — sua dívida acima já entrou em dividaTotal, só o lado do ativo fica de fora (Parte 4:
    // nunca inventamos o valor que falta).
    const valorFrotaTotal = veiculosAtivos.reduce((soma, v) => soma + (v.valorAtual ?? 0), 0);
    const equityTotal = valorFrotaTotal - dividaTotal;
    const noiDoMes = receita - custosOperacionais;
    const dscr = parcelasDoMes > 0 ? noiDoMes / parcelasDoMes : null;

    meses.push({
      mes,
      frotaTotal: veiculosAtivos.length,
      veiculosComprados: veiculosComprados.filter((v) => v.mesCompra === mes).length,
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
  const capitalTotalMovimentado = veiculosComprados.reduce((s, v) => s + v.entrada, 0);
  const crescimentoAutofinanciadoPct = capitalTotalMovimentado > 0 ? 100 : null;

  return {
    estrategia,
    horizonte,
    metodo: cenario.metodo_crescimento,
    meses,
    veiculos: veiculosComprados,
    eventos,
    proximoVeiculo: calcularProximoVeiculo(meses, veiculosComprados.length, cenario, custoMinimoParaComprar, ultimoMotivoBloqueio, horizonte),
    frotaInicial: mesInicial.frotaTotal,
    frotaFinal: mesFinal.frotaTotal,
    veiculosCompradosTotal: veiculosComprados.length,
    veiculosVendidosTotal: veiculosComprados.filter((v) => v.vendidoNoMes !== null).length,
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
    frotaRealIntegrada: frotaReal.length,
    frotaRealSemValorConhecido: frotaReal.filter((v) => v.valorAtual === null).length,
  };
}

/** Executa as 3 estratégias sobre o mesmo cenário — tabela de comparação da seção 24. */
export function compararCrescimentoComposto(
  cenario: CenarioExpansao,
  horizonte: HorizonteCrescimento,
  frotaReal: VeiculoRealParaProjecao[] = []
): Record<EstrategiaExpansao, ResultadoCrescimentoComposto> {
  return {
    conservadora: calcularCrescimentoComposto(cenario, 'conservadora', horizonte, frotaReal),
    balanceada: calcularCrescimentoComposto(cenario, 'balanceada', horizonte, frotaReal),
    agressiva: calcularCrescimentoComposto(cenario, 'agressiva', horizonte, frotaReal),
  };
}

// Fase 2.1 — usa v.valorFinanciado (por veículo) em vez de um valor global: para origem
// 'projetado' é o financiamento hipotético do cenário (igual à Fase 2); para origem 'real' é o
// saldoDevedorAtual já calculado por calcularResumoFinanciamentoReal (mesmo número exibido na
// ficha do veículo), garantindo que o "antes da 1ª parcela simulada" bate com o real.
function saldoDevedorNoFimDoMes(v: VeiculoProjetado, mes: number, tabelasPorVeiculo: Map<number, LinhaAmortizacao[]>, tabelaPadrao: LinhaAmortizacao[]): number {
  const tabela = tabelasPorVeiculo.get(v.numero) ?? tabelaPadrao;
  const r = mes - v.mesCompra;
  if (r < 1) return v.valorFinanciado;
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
