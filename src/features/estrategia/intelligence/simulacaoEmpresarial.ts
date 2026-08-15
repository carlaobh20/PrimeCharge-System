import { calcularParcelaPrice as calcularParcela } from '@/shared/lib/amortizacao';
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
// 2026-08-10 — juros sobre caixa parado + custos administrativos + IR: pedido do Carlos pra
// "sistema mais inteligente". Caixa disponível agora rende (taxa_juros_investimento_aa_pct,
// convertida pra mensal composta), a empresa tem custo de abertura (uma vez) e contador (mensal,
// não por veículo), e o lucro líquido reportado em todo o módulo passou a ser DEPOIS de IR — antes
// disso "lucro líquido" era só receita − despesa, o que já era o nome errado pro que era mostrado.
// Todos os campos novos nascem com default 0 no schema, então cenário nenhum muda de
// comportamento até o dono preencher algum desses valores.
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
  /** Contador — custo fixo da EMPRESA, não multiplicado pela frota (2026-08-10). */
  administrativo: number;
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
  /** Receita + juros de investimento − despesas (incluindo contador), JÁ LÍQUIDO de IR
   * (2026-08-10). Antes de existir IR/juros de investimento no motor isso era só
   * receita − despesa; agora "lucro líquido" significa depois desses dois efeitos, como o nome
   * sempre devia significar. */
  lucroMensal: number;
  lucroAcumulado: number;
  /** Variação real do caixa no mês — difere do lucro quando o mês inclui a entrada de um veículo comprado (capex) ou amortização extra. */
  fluxoLivreMensal: number;
  /** Juros ganhos neste mês sobre o caixa que estava disponível no início do mês (2026-08-10,
   * "dinheiro aplicado"). Sempre creditado no caixa, independente de reinvestir_lucro — é
   * rendimento passivo do que já está na conta, não uma decisão de reinvestimento. */
  jurosInvestimentoMensal: number;
  jurosInvestimentoAcumulado: number;
  /** IR do mês — incide sobre receita + juros de investimento − despesas, só se esse total for
   * positivo. Sempre descontado do caixa, independente de reinvestir_lucro (imposto não é
   * opcional). */
  irMensal: number;
  irAcumulado: number;
  /** Amortização extraordinária aplicada neste mês (além da parcela normal) — 0 se a estratégia é 'nunca' ou não se aplicou neste mês específico. */
  amortizacaoExtraMensal: number;
  /** Soma de toda amortização extraordinária desde o mês 0 — o que a estratégia escolhida já tirou de dívida além do cronograma padrão. */
  amortizacaoExtraAcumulada: number;
  /** Parte da parcela normal (Price) que é amortização de principal, não juros — soma de todos os veículos financiados neste mês. Usado no Fluxo Detalhado (Card "ano a ano"). */
  amortizacaoProgramadaMensal: number;
  /** Juros do FINANCIAMENTO embutidos na parcela deste mês (parcela cobrada − amortização
   * programada), somados sobre todos os veículos com saldo. Já era calculado no loop (compõe a
   * parcela e entra na despesa via despesaBreakdown.parcelas) — passa a ser exposto pra o Fluxo
   * Detalhado poder mostrar "Juros da dívida" separado da amortização. Não é conta nova: é a mesma
   * decomposição da Tabela Price (parcela = juros + amortização programada), sem nenhuma alteração
   * de fórmula. NÃO confundir com jurosInvestimentoMensal (rendimento do caixa parado). */
  jurosFinanciamentoMensal: number;
  /** Quantos veículos foram comprados NESTE mês especificamente (mesCompra === mes) — iniciais contam no mês 0. Não confundir com `frota`: `frota` é capturado ANTES da compra deste mês rodar (proposital — um veículo comprado agora ainda não gera receita neste mês), então `frota` só reflete essa compra a partir do mês seguinte. `comprasNoMes` existe pra marcar o momento exato da compra (gráfico/tabela), sem depender desse deslocamento de um mês do `frota`. */
  comprasNoMes: number;
  valorDaEmpresa: number;
  roiAcumuladoPct: number | null;
  /** Auditoria 2026-08-13, Parte 12 — lucro do mês ÷ capital próprio investido acumulado (mesma
   * base do ROI acumulado, nunca patrimônio/equity — evita duas definições de "capital próprio"
   * dentro do mesmo módulo). null quando não há capital próprio investido ainda (mostrar "—"). */
  retornoMensalSobreCapitalPropioPct: number | null;
  /** Fase 4.1 (2026-08-13) — movido de DinheiroDoBolsoCard.tsx. Lucro acumulado até este mês,
   * travado entre 0 e o capital PRÓPRIO investido até aqui: nunca negativo (não faz sentido
   * "recuperar menos que zero") e nunca acima do capital investido (acima disso não é mais
   * "recuperação", é lucro de verdade — o que ROI/Payback já respondem). Mesma definição de
   * `calcularCapitalRecuperado` em src/features/frota/intelligence/investmentSimulator.ts
   * (Épico 4, veículo real) — domínio diferente (lá é um veículo real com lucro confirmado; aqui
   * é o cenário hipotético inteiro, capital investido acumulado ao longo de N compras simuladas),
   * mas a mesma fórmula, o que reforça que essa é a definição certa nesta base de código.
   * null quando não há capital próprio investido ainda (nada a recuperar) — mesmo padrão de
   * roiAcumuladoPct. */
  capitalRecuperadoAcumulado: number | null;
  /** capitalInvestidoAcumulado − capitalRecuperadoAcumulado — quanto do capital próprio ainda não
   * voltou pro bolso do dono. null no mesmo caso acima. */
  capitalAindaAEmpatado: number | null;
  /** capitalRecuperadoAcumulado ÷ capitalInvestidoAcumulado × 100 — mesma base do ROI acumulado.
   * null no mesmo caso acima. */
  percentualRecuperadoPct: number | null;
  /** Fase 4.2 (2026-08-13) — movido de FluxoDetalhadoTable.tsx/FluxoDeCaixaChart.tsx, que
   * recalculavam isso cada um por conta própria (`despesaMensal - despesaBreakdown.parcelas`).
   * `fluxoAnual.ts` (motor) já fazia exatamente essa mesma conta pra agregar por ano — a auditoria
   * da Fase 4.2 achou essa duplicação e centralizou aqui: despesa operacional pura (seguro, IPVA,
   * rastreador, lavagem, manutenção, licenciamento, contador), SEM a parcela do financiamento —
   * mesma definição de "Despesas"/"Custos" já usada na tabela e no gráfico. */
  despesaSemParcelaMensal: number;
  /** Fase 4.2 (2026-08-13) — mesma origem do campo acima: `amortizacaoProgramadaMensal +
   * amortizacaoExtraMensal`, que FluxoDetalhadoTable.tsx e fluxoAnual.ts recalculavam cada um por
   * conta própria. Parte da parcela (+ eventual amortização extra) que reduziu o principal da
   * dívida neste mês — não é despesa (despesa é só o juros, já embutido em despesaBreakdown.parcelas). */
  amortizacaoTotalMensal: number;
  /** Fase 4.2 (2026-08-13) — movido de EvolucaoPatrimonioCard.tsx. patrimonioLiquido ÷
   * capitalInvestidoAcumulado × 100: quanto do patrimônio construído nos carros representa, em
   * proporção, o capital PRÓPRIO que entrou. Conceito DIFERENTE de roiAcumuladoPct (que usa LUCRO,
   * não patrimônio) e de percentualRecuperadoPct (que usa lucro travado em [0, capital investido],
   * não patrimônio) — os três dividem por capitalInvestidoAcumulado, mas o numerador de cada um
   * responde uma pergunta diferente. null quando não há capital próprio investido ainda (mesmo
   * padrão dos outros percentuais desta lista). */
  patrimonioSobreCapitalInvestidoPct: number | null;
};

/** Fase 4.1 (2026-08-13) — movido de AmortizacaoCard.tsx (Prioridade 7 da missão "copiloto
 * financeiro", 2026-08-10). Não depende de nenhum mês específico da simulação (usa só os
 * parâmetros do cenário) — por isso fica no nível raiz de SimulacaoResultado, ao lado de
 * aquisicaoInicial/payback, não dentro de cada MesSimulado. */
export type ComparacaoAmortizarVsComprar = {
  valeAmortizar: boolean;
  /** Quanto a.a. de juros deixa de ser pago amortizando (taxa do financiamento × 12). */
  economiaAmortizarAaPct: number;
  /** Quanto a.a. renderia o mesmo dinheiro comprando mais um veículo (receita líquida anual do
   * próximo carro ÷ custo total dele). 0 quando o custo total é 0. */
  retornoComprarAaPct: number;
};

/** Auditoria 2026-08-13, Parte 13 — nasce no motor (nunca no componente React). 'recuperado' só
 * quando o lucro acumulado alcança o capital próprio investido em algum mês; 'sem_capital' quando
 * nenhum capital próprio jamais foi investido no horizonte (nada a recuperar); 'nao_recuperado'
 * quando houve capital investido mas o lucro acumulado nunca o alcançou dentro do horizonte —
 * nunca inventamos uma data nesse caso. */
export type PaybackResultado = { estado: 'recuperado'; mes: number } | { estado: 'nao_recuperado' } | { estado: 'sem_capital' };

/** Auditoria 2026-08-13, Parte 14/15 — o que aconteceu na tentativa de compra inicial (mês 0),
 * sempre presente (não só quando dá errado) pra Visão Executiva poder mostrar "desejados vs.
 * adquiridos" mesmo no caso feliz. */
export type AquisicaoInicial = {
  veiculosDesejados: number;
  veiculosAdquiridos: number;
  /** Caixa disponível antes de qualquer compra (já descontado custo_abertura_empresa). */
  capitalDisponivel: number;
  /** Custo mínimo do PRÓXIMO veículo que não coube (entrada + reserva de segurança) — null quando
   * todos os veículos desejados foram adquiridos (não há "próximo" bloqueado). */
  capitalNecessario: number | null;
  /** max(0, capitalNecessario - capitalDisponivel) no momento exato do bloqueio. 0 quando não há bloqueio. */
  capitalFaltante: number;
};

export type SimulacaoResultado = {
  meses: MesSimulado[];
  objetivoAlcancadoNoMes: number | null;
  frotaFinal: number;
  aquisicaoInicial: AquisicaoInicial;
  payback: PaybackResultado;
};

/** Fase 4.1 (2026-08-13, movida de AmortizacaoCard.tsx) — compara duas taxas anualizadas, não
 * valores em R$: (a) juros que deixam de ser pagos ao amortizar (taxa do financiamento × 12)
 * contra (b) o retorno que o mesmo dinheiro renderia comprando mais um veículo (receita líquida
 * anual do próximo carro ÷ custo total dele). Simplificação assumida (DEC-022, preservada da
 * versão original): não considera composição nem o efeito de crescer a frota mês a mês (o motor
 * principal já faz essa conta completa — isso aqui é uma comparação rápida de ORDEM DE GRANDEZA,
 * pensada pra responder "essa direção faz sentido", não pra substituir a simulação). Não duplica
 * nenhuma função de amortização existente (PMT/Price/saldo devedor) — é um cálculo independente,
 * baseado só em receita/despesa esperada por veículo e na taxa de juros do financiamento. */
export function calcularComparacaoAmortizarVsComprar(cenario: CenarioSimulacaoInput): ComparacaoAmortizarVsComprar {
  const aluguelMensalPorVeiculo = cenario.aluguel_esperado_semanal_por_veiculo * SEMANAS_POR_MES;
  const ocupacao = cenario.ocupacao_esperada_pct / 100;
  const inadimplencia = cenario.inadimplencia_esperada_pct / 100;
  const receitaLiquidaPorVeiculo =
    aluguelMensalPorVeiculo * ocupacao * (1 - inadimplencia) -
    (cenario.seguro_mensal_por_veiculo +
      cenario.ipva_anual_por_veiculo / 12 +
      cenario.rastreador_mensal_por_veiculo +
      cenario.lavagem_mensal_por_veiculo +
      cenario.manutencao_mensal_por_veiculo +
      cenario.licenciamento_anual_por_veiculo / 12);
  const custoTotalPorVeiculo = cenario.valor_entrada_por_veiculo + cenario.valor_financiado_por_veiculo;
  const retornoComprarAaPct = custoTotalPorVeiculo > 0 ? ((receitaLiquidaPorVeiculo * 12) / custoTotalPorVeiculo) * 100 : 0;
  const economiaAmortizarAaPct = cenario.taxa_juros_am_pct * 12;
  return { valeAmortizar: economiaAmortizarAaPct >= retornoComprarAaPct, economiaAmortizarAaPct, retornoComprarAaPct };
}

/** Fase 4.2 (2026-08-13, movida de PainelDePremissas.tsx) — "dá pra comprar quantos veículos
 * agora", com o capital_disponivel BRUTO do cenário (não o caixa já simulado mês a mês — é uma
 * pergunta sobre o presente, respondida antes de rodar qualquer mês). Mesma regra de sempre:
 * capital menos a reserva de segurança, dividido pela entrada por veículo, arredondado pra baixo
 * (não dá pra comprar "meio carro"), nunca negativo. Retorna 0 quando a entrada é 0 (divisão por
 * zero não faz sentido aqui — "entrada 0" geralmente significa forma de aquisição ainda não
 * configurada, não "carro de graça"). Reproduz exatamente o comportamento anterior — nenhum
 * arredondamento, reserva ou tratamento de capital insuficiente foi alterado. */
export function calcularVeiculosDisponiveisAgora(cenario: CenarioSimulacaoInput): number {
  if (cenario.valor_entrada_por_veiculo <= 0) return 0;
  return Math.max(0, Math.floor((cenario.capital_disponivel - cenario.reserva_de_seguranca) / cenario.valor_entrada_por_veiculo));
}

/** Resumo da amortização extraordinária no horizonte inteiro — nasce no motor (nunca no card), só
 * lê campos já calculados de MesSimulado + o valor configurado do cenário. Serve pro AmortizacaoCard
 * distinguir CONFIGURADO x APLICADO sem refazer nenhuma conta. */
export type ResumoAmortizacaoExtra = {
  /** Valor por evento que o dono configurou (amortizacao_valor_manual). 0 quando não se aplica. */
  configuradoPorEvento: number;
  /** Total efetivamente amortizado a mais no horizonte = amortizacaoExtraAcumulada do último mês. */
  totalAplicado: number;
  /** true quando, em ALGUM mês-evento, aplicou-se um valor > 0 porém MENOR que o configurado —
   * sinal de que o caixa ou o saldo devedor limitou o pagamento naquele mês. Não marca meses com
   * 0 (dívida já quitada ou estratégia sem evento naquele mês não são "limitação"). */
  algumMesLimitadoPorCaixa: boolean;
};

/** Fase amortização (2026-08-14) — agrega o que o motor já calculou por mês. Sem fórmula financeira
 * nova: `totalAplicado` é o acumulado do último mês; `algumMesLimitadoPorCaixa` só compara o valor
 * aplicado (motor) com o configurado (cenário). O teto de caixa/saldo é decidido dentro de
 * `simularCrescimentoEmpresarial` (Math.min com caixaDisponivel e com o saldo devedor) — aqui só se
 * observa o resultado. */
export function resumirAmortizacaoExtra(meses: MesSimulado[], cenario: CenarioSimulacaoInput): ResumoAmortizacaoExtra {
  const configuradoPorEvento = cenario.amortizacao_valor_manual ?? 0;
  const totalAplicado = meses.length > 0 ? meses[meses.length - 1].amortizacaoExtraAcumulada : 0;
  const algumMesLimitadoPorCaixa =
    configuradoPorEvento > 0 &&
    meses.some((m) => m.amortizacaoExtraMensal > 0.005 && m.amortizacaoExtraMensal < configuradoPorEvento - 0.005);
  return { configuradoPorEvento, totalAplicado, algumMesLimitadoPorCaixa };
}

type VeiculoSimulado = {
  mesCompra: number;
  valorOriginal: number;
  saldoDevedor: number;
  parcela: number;
};

// Exportada (Fase 3) — o motor de "Momento Ideal de Comprar" (momentoDeCompra.ts) precisa da
// mesma fórmula Price/francesa pra projetar um veículo isolado, sem duplicar a conta aqui.
// 2026-08-10 (Épico 4 "Ativo Financeiro") — a fórmula da Tabela Price virou utilitário
// compartilhado (o financiamento REAL de cada veículo em /frota também precisa dela agora).
// Re-exportada aqui com o nome antigo pra não quebrar quem já importava `calcularParcela`
// deste arquivo (ex. momentoDeCompra.ts).
export { calcularParcela };

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

  // Conversão anual → mensal composta (não linear): (1+i_aa)^(1/12) - 1. É a conversão
  // financeiramente correta pra taxa de rendimento (diferente de IPVA/licenciamento, que são
  // CUSTOS anuais divididos por 12 — ali é só ratear um valor fixo, aqui é uma taxa que precisa
  // compor mês a mês pra bater com o rendimento anual configurado.
  const taxaJurosInvestimentoAm = Math.pow(1 + cenario.taxa_juros_investimento_aa_pct / 100, 1 / 12) - 1;

  const veiculos: VeiculoSimulado[] = [];
  // custo_abertura_empresa: desconta ANTES de qualquer compra de veículo — é o primeiro evento de
  // caixa da empresa (2026-08-10). Se isso comer capital que seria de veículo, o aviso de "capital
  // inicial insuficiente" abaixo já pega isso naturalmente (caixaDisponivel já reflete o desconto).
  let caixaDisponivel = cenario.capital_disponivel - cenario.custo_abertura_empresa;
  let lucroAcumulado = 0;
  let capitalInvestidoAcumulado = 0;
  let amortizacaoExtraAcumulada = 0;
  let jurosInvestimentoAcumulado = 0;
  let irAcumulado = 0;
  // Conta compras por mês (mesCompra → quantidade), independente do array `veiculos` — usado só
  // pra alimentar `comprasNoMes` em cada MesSimulado (marcador de "aqui comprei" no gráfico/tabela,
  // pedido do Carlos 2026-08-09). Cobre tanto a compra inicial (mês 0) quanto as compras de
  // crescimento (mes > 0, dentro do loop principal).
  const comprasPorMes = new Map<number, number>();

  function comprarVeiculo(mes: number) {
    veiculos.push({
      mesCompra: mes,
      valorOriginal: custoTotalPorVeiculo,
      saldoDevedor: cenario.valor_financiado_por_veiculo,
      parcela: parcelaPadrao,
    });
    caixaDisponivel -= cenario.valor_entrada_por_veiculo;
    // Auditoria 2026-08-13, achado A / Parte 4 — capital investido é CAPITAL PRÓPRIO (o que saiu
    // do bolso), nunca o preço cheio do veículo. À vista, valor_entrada_por_veiculo JÁ é o preço
    // cheio (financiado = 0 nesse caso); financiado, é só a entrada. A mesma linha cobre os dois
    // casos sem precisar checar forma_aquisicao aqui — era exatamente esse o bug: somava
    // custoTotalPorVeiculo (entrada + financiado), contando a dívida do banco como se fosse
    // dinheiro do dono.
    capitalInvestidoAcumulado += cenario.valor_entrada_por_veiculo;
    comprasPorMes.set(mes, (comprasPorMes.get(mes) ?? 0) + 1);
  }

  // reserva_de_seguranca (2026-08-10, pedido do Carlos: "caixa de emergência") — o motor só
  // compra um veículo se, DEPOIS de pagar a entrada, ainda sobrar pelo menos essa reserva em
  // caixa. Vale tanto pra compra inicial quanto pra compra de crescimento (abaixo) e pra
  // amortização extraordinária 'quando_sobrar_caixa' (mais abaixo) — os 3 lugares que consomem
  // caixa livre têm que respeitar o mesmo piso, senão a reserva "vaza" por outro caminho.
  const custoMinimoParaComprar = cenario.valor_entrada_por_veiculo + cenario.reserva_de_seguranca;

  // Auditoria 2026-08-13, Parte 14/15 — capturado ANTES do loop consumir caixaDisponivel, pra
  // "capitalDisponivel" do relatório mostrar o caixa que realmente existia pra decidir a compra,
  // não o que sobrou depois. capitalNecessario/capitalFaltante só ficam preenchidos se o loop
  // parar antes do desejado (ver abaixo) — não inventamos um "faltante" quando não faltou nada.
  const capitalDisponivelParaAquisicaoInicial = caixaDisponivel;
  const veiculosIniciaisDesejados = Math.min(cenario.veiculos_iniciais, cenario.objetivo_veiculos);
  let capitalNecessarioBloqueio: number | null = null;
  let capitalFaltanteBloqueio = 0;
  for (let n = 0; n < veiculosIniciaisDesejados; n++) {
    if (caixaDisponivel < custoMinimoParaComprar) {
      capitalNecessarioBloqueio = custoMinimoParaComprar;
      capitalFaltanteBloqueio = Math.max(0, custoMinimoParaComprar - caixaDisponivel);
      break;
    }
    comprarVeiculo(0);
  }
  const aquisicaoInicial: AquisicaoInicial = {
    veiculosDesejados: veiculosIniciaisDesejados,
    veiculosAdquiridos: veiculos.length,
    capitalDisponivel: capitalDisponivelParaAquisicaoInicial,
    capitalNecessario: capitalNecessarioBloqueio,
    capitalFaltante: capitalFaltanteBloqueio,
  };

  const meses: MesSimulado[] = [];
  let objetivoAlcancadoNoMes: number | null = veiculos.length >= cenario.objetivo_veiculos ? 0 : null;

  for (let mes = 0; mes <= cenario.prazo_desejado_meses; mes++) {
    let parcelasDoMes = 0;
    let amortizacaoProgramadaDoMes = 0;
    let jurosFinanciamentoDoMes = 0;
    for (const v of veiculos) {
      if (v.saldoDevedor <= 0) continue;
      const juros = v.saldoDevedor * (cenario.taxa_juros_am_pct / 100);
      const amortizacaoDaParcela = Math.min(v.parcela - juros, v.saldoDevedor);
      const parcelaCobrada = Math.min(v.parcela, v.saldoDevedor + juros);
      v.saldoDevedor = Math.max(0, v.saldoDevedor - amortizacaoDaParcela);
      parcelasDoMes += parcelaCobrada;
      amortizacaoProgramadaDoMes += amortizacaoDaParcela;
      // Juros embutido nesta parcela = parcela cobrada − amortização de principal. Identidade exata
      // da Price (inclusive no mês final parcial), então "Parcela = Juros + Amort. programada" fecha
      // no display sem nenhuma conta nova.
      jurosFinanciamentoDoMes += parcelaCobrada - amortizacaoDaParcela;
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
      administrativo: cenario.contador_mensal,
    };
    const despesaMensal = Object.values(despesaBreakdown).reduce((a, b) => a + b, 0);
    const lucroOperacionalMensal = receitaMensal - despesaMensal;

    const caixaAntesDoMes = caixaDisponivel;

    // Juros sobre o caixa que já estava disponível no início do mês ("dinheiro aplicado",
    // 2026-08-10) — sempre creditado, é rendimento passivo do que já está na conta, não depende
    // de reinvestir_lucro (essa flag só controla o que fazer com o LUCRO OPERACIONAL do mês).
    const jurosInvestimentoMensal = caixaAntesDoMes * taxaJurosInvestimentoAm;
    caixaDisponivel += jurosInvestimentoMensal;
    jurosInvestimentoAcumulado += jurosInvestimentoMensal;

    // IR incide sobre receita + juros de investimento − despesas (o lucro "de verdade" do mês,
    // antes de decidir reinvestir ou não) — só sobre valor positivo, e sempre pago (imposto não é
    // opcional como reinvestir_lucro é).
    const lucroAntesDeIR = lucroOperacionalMensal + jurosInvestimentoMensal;
    const irMensal = Math.max(0, lucroAntesDeIR) * (cenario.taxa_ir_pct / 100);
    caixaDisponivel -= irMensal;
    irAcumulado += irMensal;

    const lucroMensal = lucroAntesDeIR - irMensal;
    lucroAcumulado += lucroMensal;

    // 2026-08-10 — correção de causa (achado da auditoria "copiloto financeiro"): PREJUÍZO
    // operacional sempre sai do caixa, não é opcional. Antes desta correção, com
    // reinvestir_lucro=false, um mês de prejuízo (receita < despesa) simplesmente não descontava
    // do caixa — o caixa ficava artificialmente estável mesmo a operação sangrando dinheiro, o
    // que tornaria qualquer indicador de "runway"/"dias até precisar de aporte" mentiroso. A
    // decisão de reinvestir ou não é sobre o que fazer com um LUCRO (positivo) — guardar na
    // empresa (Sim) ou o dono retirar todo mês (Não); nunca foi sobre "escolher não pagar as
    // contas". Prejuízo é sempre absorvido pelo caixa da empresa, com o toggle em qualquer posição.
    if (lucroOperacionalMensal < 0) {
      caixaDisponivel += lucroOperacionalMensal;
    } else if (cenario.reinvestir_lucro) {
      caixaDisponivel += lucroOperacionalMensal;
    }

    if (mes > 0) {
      while (veiculos.length < cenario.objetivo_veiculos && caixaDisponivel >= custoMinimoParaComprar) {
        comprarVeiculo(mes);
      }
    }

    // Amortização extraordinária (Card 4) — depois de tentar crescer a frota, pra não competir
    // com a compra de veículo no mesmo caixa. 'quando_sobrar_caixa' só age depois que a frota já
    // atingiu o objetivo (antes disso, "sobra" é capital de crescimento represado, não sobra
    // real) — e, como a compra de veículo, também não pode consumir a reserva_de_seguranca:
    // "sobrar caixa" tem que sobrar ACIMA da reserva, senão amortização extra esvazia a reserva
    // por um caminho que a compra de veículo não deixaria.
    let amortizacaoExtraMensal = 0;
    if (mes > 0 && caixaDisponivel > 0) {
      let valorAlvo = calcularValorAmortizacaoExtra(cenario, mes);
      if (valorAlvo === Infinity) {
        valorAlvo = veiculos.length >= cenario.objetivo_veiculos ? Math.max(0, caixaDisponivel - cenario.reserva_de_seguranca) : 0;
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
    // Auditoria 2026-08-13, Parte 12 — mesma base do ROI acumulado (capital próprio investido),
    // nunca patrimônio/equity: duas métricas de "retorno" com bases diferentes confundem mais do
    // que ajudam. null (mostrado como "—") enquanto não há capital próprio investido.
    const retornoMensalSobreCapitalPropioPct = capitalInvestidoAcumulado > 0 ? (lucroMensal / capitalInvestidoAcumulado) * 100 : null;
    // Fase 4.1 (2026-08-13) — movido de DinheiroDoBolsoCard.tsx. Mesma base do ROI acumulado
    // (capital PRÓPRIO investido); lucroAcumulado travado em [0, capitalInvestidoAcumulado] antes
    // de virar "capital recuperado" — ver definição completa no comentário do campo em MesSimulado.
    const capitalRecuperadoAcumulado = capitalInvestidoAcumulado > 0 ? Math.min(Math.max(0, lucroAcumulado), capitalInvestidoAcumulado) : null;
    const capitalAindaAEmpatado = capitalRecuperadoAcumulado === null ? null : capitalInvestidoAcumulado - capitalRecuperadoAcumulado;
    const percentualRecuperadoPct = capitalRecuperadoAcumulado === null ? null : (capitalRecuperadoAcumulado / capitalInvestidoAcumulado) * 100;
    // Fase 4.2 (2026-08-13) — movidos de FluxoDetalhadoTable.tsx/FluxoDeCaixaChart.tsx (ver
    // comentário do campo em MesSimulado — mesma conta que fluxoAnual.ts já fazia pra agregar por
    // ano, agora com uma única origem).
    const despesaSemParcelaMensal = despesaMensal - despesaBreakdown.parcelas;
    const amortizacaoTotalMensal = amortizacaoProgramadaDoMes + amortizacaoExtraMensal;
    // Fase 4.2 (2026-08-13) — movido de EvolucaoPatrimonioCard.tsx (ver comentário do campo em
    // MesSimulado pra diferença em relação a roiAcumuladoPct/percentualRecuperadoPct).
    const patrimonioSobreCapitalInvestidoPct = capitalInvestidoAcumulado > 0 ? (patrimonioLiquido / capitalInvestidoAcumulado) * 100 : null;

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
      jurosInvestimentoMensal,
      jurosInvestimentoAcumulado,
      irMensal,
      irAcumulado,
      amortizacaoExtraMensal,
      amortizacaoExtraAcumulada,
      amortizacaoProgramadaMensal: amortizacaoProgramadaDoMes,
      jurosFinanciamentoMensal: jurosFinanciamentoDoMes,
      comprasNoMes: comprasPorMes.get(mes) ?? 0,
      valorDaEmpresa: caixaDisponivel + patrimonioLiquido,
      roiAcumuladoPct,
      retornoMensalSobreCapitalPropioPct,
      capitalRecuperadoAcumulado,
      capitalAindaAEmpatado,
      percentualRecuperadoPct,
      despesaSemParcelaMensal,
      amortizacaoTotalMensal,
      patrimonioSobreCapitalInvestidoPct,
    });

    if (objetivoAlcancadoNoMes === null && frota >= cenario.objetivo_veiculos) {
      objetivoAlcancadoNoMes = mes;
    }
  }

  // Auditoria 2026-08-13, Parte 13 — primeiro mês em que o lucro acumulado alcança o capital
  // próprio investido ATÉ AQUELE MÊS (não o capital final): se um 2º veículo entra depois, o alvo
  // sobe a partir daquele ponto, então "recuperado" só conta quando o lucro já superou o que
  // estava investido NAQUELE momento. `capitalInvestidoAcumulado > 0` no find evita o caso
  // degenerado de "recuperado" com zero capital investido (0 >= 0 seria vacuamente verdadeiro).
  let payback: PaybackResultado;
  if (capitalInvestidoAcumulado <= 0) {
    payback = { estado: 'sem_capital' };
  } else {
    const mesRecuperado = meses.find((m) => m.capitalInvestidoAcumulado > 0 && m.lucroAcumulado >= m.capitalInvestidoAcumulado);
    payback = mesRecuperado ? { estado: 'recuperado', mes: mesRecuperado.mes } : { estado: 'nao_recuperado' };
  }

  return {
    meses,
    objetivoAlcancadoNoMes,
    frotaFinal: veiculos.length,
    aquisicaoInicial,
    payback,
  };
}
