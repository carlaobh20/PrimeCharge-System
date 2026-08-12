import { gerarTabelaAmortizacao, type LinhaAmortizacao, type SistemaAmortizacao } from '@/shared/lib/amortizacao';
import { SEMANAS_POR_MES } from '../../intelligence/simulacaoEmpresarial';

// Épico 10 — "Inteligência de Renovação e Reciclagem de Capital", Fase 1. Responde à pergunta
// central pedida pelo Carlos: "quando vender um carro para reciclar capital e maximizar o
// patrimônio?" — via um MOTOR DETERMINÍSTICO (nenhuma IA, nenhuma inferência de mercado), que
// simula, mês a mês, um único veículo sob cada momento de venda candidato (incluindo "nunca
// vender") até um horizonte fixo, e compara o patrimônio final resultante entre eles.
//
// Regra fundamental do brief: "não criar uma IA que inventa uma recomendação" — toda
// recomendação sai de números já calculados linha a linha, auditáveis (ver
// `explicarMelhorEscolha`, que só concatena deltas de campos já existentes em
// `ResultadoMomentoDeVenda`, nunca gera texto a partir de heurística separada).
//
// Fase 1 NÃO usa FIPE/scraping/mercado/ML/IA generativa (fora de escopo explícito do brief). O
// valor de venda é sempre PREMISSA do usuário — nunca inferido (DEC-022).
//
// ESCOPO DESTA FASE (decisão registrada aqui, não pedida explicitamente linha a linha no brief,
// mas necessária pra implementar sem inventar infraestrutura genérica demais — Regra dos 3):
// 1 veículo por vez, não uma otimização multi-frota. A pergunta é "quando vender ESTE carro",
// não "qual a alocação ótima de N carros" — isso é uma generalização sem caso de uso concreto
// ainda. Por isso este motor NÃO reaproveita o loop de compounding de N-veículos de
// crescimentoComposto.ts (que resolve um problema diferente: crescimento composto de uma frota
// inteira a partir de capital externo `cenario.capital_disponivel`) — reaproveita só as peças
// matemáticas comuns: gerarTabelaAmortizacao (shared/lib/amortizacao) e SEMANAS_POR_MES
// (Épico 3, mesma constante usada em todo o resto do app).
//
// REINVESTIMENTO (seção 11 do brief: "1 → venda → 2 novos" — "o algoritmo precisa capturar
// isso"): no mês da venda, o capital líquido reciclado (mais qualquer caixa operacional já
// acumulado por este veículo até ali) financia, em loop, a ENTRADA de quantos veículos
// idênticos (mesmo cenário) couberem sem violar a reserva mínima — pode ser 0, 1 ou mais que 1,
// dependendo do quanto sobrou. Fase 1 modela só ESSA rodada única de reinvestimento: os
// veículos de reposição são projetados até o horizonte, mas não são candidatos a uma nova
// decisão de venda dentro desta mesma simulação (isso seria um otimizador recursivo
// multi-geração — fora do escopo de "quando vender ESTE carro").
//
// RESERVA MÍNIMA só governa a decisão de reinvestir (é uma escolha de compra, controlável) — não
// trava o caixa operacional do próprio veículo original, que já é seu, sunk, e continua rodando
// independente do saldo de caixa acumulado (não existe "não posso mais operar o carro que já é
// meu" por falta de reserva).

export type CenarioDecisaoVenda = {
  precoVeiculo: number;
  entrada: number;
  taxaJurosAmPct: number;
  prazoFinanciamentoMeses: number;
  sistemaAmortizacao: SistemaAmortizacao;
  aluguelSemanalPorVeiculo: number;
  ocupacaoPct: number;
  seguroMensalPorVeiculo: number;
  ipvaAnualPorVeiculo: number;
  rastreadorMensalPorVeiculo: number;
  manutencaoPorKm: number;
  kmMensal: number;
  reservaMinima: number;
  /** PREMISSA do usuário (ou DADO REAL, se o veículo já foi vendido de fato) — nunca FIPE/mercado/IA nesta fase (DEC-022). */
  valorVenda: number;
  vendaCustosPct: number;
  horizonteMeses: number;
};

export type MesDecisaoVenda = {
  mes: number;
  frotaAtiva: number;
  receita: number;
  custosOperacionais: number;
  jurosDoMes: number;
  amortizacaoDoMes: number;
  saldoDevedor: number;
  caixa: number;
  equity: number;
  patrimonio: number;
};

export type EventoDecisaoVenda =
  | { tipo: 'venda'; mes: number; valorVenda: number; saldoDevedor: number; custosVenda: number; liquido: number }
  | { tipo: 'reinvestimento'; mes: number; entradaUtilizada: number };

export type ResultadoMomentoDeVenda = {
  /** null = "manter até o fim do horizonte" (nunca vender). */
  mesVenda: number | null;
  meses: MesDecisaoVenda[];
  eventos: EventoDecisaoVenda[];
  receitaAcumulada: number;
  custosOperacionaisAcumulados: number;
  jurosAcumulados: number;
  amortizacaoAcumulada: number;
  parcelasPagasAcumuladas: number;
  /** Seção 8 do brief — métrica principal: patrimônio (caixa + equity) no último mês do horizonte, qualquer que seja o momento de venda escolhido. */
  patrimonioFinalNoHorizonte: number;
  /** Seção 9 — quanto do patrimônio final é caixa (já realizado) vs. equity (ainda preso no ativo). */
  caixaFinal: number;
  equityFinal: number;
  /** Seção 10 — quanto a venda liberou, e quanto disso de fato virou entrada de veículo novo. */
  capitalReciclado: number;
  capitalRecicladoUsadoEmNovaAquisicao: number;
  /** Seção 11 — veículos ativos no fim do horizonte (0, 1, ou mais se o reinvestimento comprou mais de 1). */
  frotaFinalUnidades: number;
  /** Seção 12 — patrimônio final / capital investido pelo usuário (entrada). null se entrada = 0 (divisão indefinida, não vira 0 nem infinito inventado). */
  crescimentoPatrimonialMultiplo: number | null;
  /** Seção 6 — RETORNO OPERACIONAL: receita − custos operacionais − juros pagos, acumulado. Exclui
   * amortização (devolução de principal, não é despesa) e exclui o evento de venda em si — é só o
   * que a operação, sozinha, gerou de resultado ao longo do tempo. */
  retornoOperacionalAcumulado: number;
  /** Seção 6 — RETORNO DO CAPITAL: patrimônio final / entrada. Mesma base de `crescimentoPatrimonialMultiplo` — ver nota nesse campo. */
  retornoDoCapitalMultiplo: number | null;
};

const EPS = 1;

function custoOperacionalMensal(c: CenarioDecisaoVenda): number {
  return c.seguroMensalPorVeiculo + c.ipvaAnualPorVeiculo / 12 + c.rastreadorMensalPorVeiculo + c.manutencaoPorKm * c.kmMensal;
}

function receitaMensalPorVeiculo(c: CenarioDecisaoVenda): number {
  return c.aluguelSemanalPorVeiculo * SEMANAS_POR_MES * (c.ocupacaoPct / 100);
}

type VeiculoSimulado = { mesCompra: number; tabela: LinhaAmortizacao[] };

function parcelaNoMes(v: VeiculoSimulado, mes: number): { juros: number; amortizacao: number; parcela: number } {
  const r = mes - v.mesCompra;
  if (r < 1 || r > v.tabela.length) return { juros: 0, amortizacao: 0, parcela: 0 };
  const linha = v.tabela[r - 1];
  return { juros: linha.juros, amortizacao: linha.amortizacao, parcela: linha.parcela };
}

/** Saldo devedor IMEDIATAMENTE ANTES da parcela do mês de referência — mesma convenção usada em
 * crescimentoComposto.ts (`saldoDevedorAntes`): é o saldo com que a venda precisa quitar a dívida
 * naquele mês, antes de a parcela daquele mês ser descontada. */
function saldoDevedorAntesDoMes(v: VeiculoSimulado, mes: number): number {
  const r = mes - v.mesCompra;
  if (v.tabela.length === 0) return 0;
  if (r <= 1) return v.tabela[0].saldoDevedor + v.tabela[0].amortizacao; // = valor financiado original
  if (r - 2 >= v.tabela.length) return 0;
  return v.tabela[r - 2].saldoDevedor;
}

/** Saldo devedor no FIM do mês de referência (depois da parcela daquele mês, se houve). */
function saldoDevedorFimDoMes(v: VeiculoSimulado, mes: number): number {
  const r = mes - v.mesCompra;
  if (v.tabela.length === 0) return 0;
  if (r < 1) return v.tabela[0].saldoDevedor + v.tabela[0].amortizacao;
  if (r > v.tabela.length) return 0;
  return v.tabela[r - 1].saldoDevedor;
}

/**
 * Simula UM momento de venda candidato (ou `null` = nunca vender) para o veículo descrito em
 * `cenario`, mês a mês até `cenario.horizonteMeses`.
 */
export function simularMomentoDeVenda(cenario: CenarioDecisaoVenda, mesVenda: number | null, reinvestir: boolean = true): ResultadoMomentoDeVenda {
  const valorFinanciadoOriginal = Math.max(0, cenario.precoVeiculo - cenario.entrada);
  const tabelaOriginal = gerarTabelaAmortizacao(valorFinanciadoOriginal, cenario.taxaJurosAmPct, cenario.prazoFinanciamentoMeses, cenario.sistemaAmortizacao);
  const custoMensal = custoOperacionalMensal(cenario);
  const receitaMensal = receitaMensalPorVeiculo(cenario);

  let veiculoOriginal: VeiculoSimulado | null = { mesCompra: 0, tabela: tabelaOriginal };
  const veiculosReinvestidos: VeiculoSimulado[] = [];

  const meses: MesDecisaoVenda[] = [];
  const eventos: EventoDecisaoVenda[] = [];

  let caixa = 0;
  let receitaAcumulada = 0;
  let custosOperacionaisAcumulados = 0;
  let jurosAcumulados = 0;
  let amortizacaoAcumulada = 0;
  let capitalReciclado = 0;
  let capitalRecicladoUsadoEmNovaAquisicao = 0;

  for (let mes = 0; mes <= cenario.horizonteMeses; mes++) {
    // 1) Venda do veículo original, se este é o mês candidato.
    if (veiculoOriginal !== null && mesVenda !== null && mes === mesVenda) {
      const saldoDevedor = saldoDevedorAntesDoMes(veiculoOriginal, mes);
      const custosVenda = cenario.valorVenda * (cenario.vendaCustosPct / 100);
      const liquido = Math.max(0, cenario.valorVenda - saldoDevedor - custosVenda);
      caixa += liquido;
      capitalReciclado += liquido;
      eventos.push({ tipo: 'venda', mes, valorVenda: cenario.valorVenda, saldoDevedor, custosVenda, liquido });
      veiculoOriginal = null;

      // 2) Reinvestimento — só neste mês (rodada única, ver cabeçalho do arquivo): compra, em
      // loop, quantos veículos idênticos couberem sem deixar o caixa abaixo da reserva mínima.
      // Fase 2 (Épico 10, item 17 do brief) — `reinvestir=false` isola o EFEITO PURO da venda,
      // sem reciclagem: parâmetro aditivo, default `true` preserva 100% o comportamento da Fase
      // 1 (validado 63/63) para qualquer chamada existente que não passe o 3º argumento.
      const custoMinimoParaComprar = cenario.entrada + cenario.reservaMinima;
      while (reinvestir && caixa + EPS >= custoMinimoParaComprar) {
        caixa -= cenario.entrada;
        capitalRecicladoUsadoEmNovaAquisicao += cenario.entrada;
        const valorFinanciadoNovo = Math.max(0, cenario.precoVeiculo - cenario.entrada);
        const tabelaNova = gerarTabelaAmortizacao(valorFinanciadoNovo, cenario.taxaJurosAmPct, cenario.prazoFinanciamentoMeses, cenario.sistemaAmortizacao);
        veiculosReinvestidos.push({ mesCompra: mes, tabela: tabelaNova });
        eventos.push({ tipo: 'reinvestimento', mes, entradaUtilizada: cenario.entrada });
      }
    }

    // 3) Operação do mês — soma sobre todos os veículos ativos (original, se ainda não vendido, + reinvestidos).
    const ativos: VeiculoSimulado[] = [...(veiculoOriginal ? [veiculoOriginal] : []), ...veiculosReinvestidos];
    const receita = ativos.length * receitaMensal;
    const custosOperacionais = ativos.length * custoMensal;
    let jurosDoMes = 0;
    let amortizacaoDoMes = 0;
    for (const v of ativos) {
      const p = parcelaNoMes(v, mes);
      jurosDoMes += p.juros;
      amortizacaoDoMes += p.amortizacao;
    }
    const parcelaDoMes = jurosDoMes + amortizacaoDoMes;
    caixa += receita - custosOperacionais - parcelaDoMes;

    receitaAcumulada += receita;
    custosOperacionaisAcumulados += custosOperacionais;
    jurosAcumulados += jurosDoMes;
    amortizacaoAcumulada += amortizacaoDoMes;

    const saldoDevedorTotal = ativos.reduce((s, v) => s + saldoDevedorFimDoMes(v, mes), 0);
    const equity = ativos.length * cenario.precoVeiculo - saldoDevedorTotal;
    const patrimonio = caixa + equity;

    meses.push({
      mes,
      frotaAtiva: ativos.length,
      receita,
      custosOperacionais,
      jurosDoMes,
      amortizacaoDoMes,
      saldoDevedor: saldoDevedorTotal,
      caixa,
      equity,
      patrimonio,
    });
  }

  const mesFinal = meses[meses.length - 1];
  const retornoOperacionalAcumulado = receitaAcumulada - custosOperacionaisAcumulados - jurosAcumulados;
  const crescimentoPatrimonialMultiplo = cenario.entrada > 0 ? mesFinal.patrimonio / cenario.entrada : null;

  return {
    mesVenda,
    meses,
    eventos,
    receitaAcumulada,
    custosOperacionaisAcumulados,
    jurosAcumulados,
    amortizacaoAcumulada,
    parcelasPagasAcumuladas: jurosAcumulados + amortizacaoAcumulada,
    patrimonioFinalNoHorizonte: mesFinal.patrimonio,
    caixaFinal: mesFinal.caixa,
    equityFinal: mesFinal.equity,
    capitalReciclado,
    capitalRecicladoUsadoEmNovaAquisicao,
    frotaFinalUnidades: mesFinal.frotaAtiva,
    crescimentoPatrimonialMultiplo,
    retornoOperacionalAcumulado,
    retornoDoCapitalMultiplo: crescimentoPatrimonialMultiplo,
  };
}

export type ComparacaoMomentosDeVenda = {
  porMomento: ResultadoMomentoDeVenda[];
  /** null se "nunca vender" for a melhor opção dentre as simuladas. */
  melhorMesVenda: number | null;
  /** Frases determinísticas, geradas só a partir de campos já calculados acima (nunca uma
   * heurística textual separada) — a resposta ao "POR QUÊ" do brief. */
  explicacao: string[];
};

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const rotuloMes = (m: number | null) => (m === null ? 'nunca vender (manter até o fim)' : `vender no mês ${m}`);

/**
 * Roda `simularMomentoDeVenda` para cada mês candidato (mais `null` = nunca vender) e compara
 * o patrimônio final no horizonte entre todos — a métrica principal da seção 8 do brief.
 */
export function compararMomentosDeVenda(cenario: CenarioDecisaoVenda, mesesCandidatos: number[]): ComparacaoMomentosDeVenda {
  const candidatos: (number | null)[] = [...mesesCandidatos, null];
  const porMomento = candidatos.map((m) => simularMomentoDeVenda(cenario, m));

  const melhor = porMomento.reduce((a, b) => (b.patrimonioFinalNoHorizonte > a.patrimonioFinalNoHorizonte ? b : a));
  const piorEntreCandidatos = porMomento.reduce((a, b) => (b.patrimonioFinalNoHorizonte < a.patrimonioFinalNoHorizonte ? b : a));
  const manterAteFim = porMomento.find((r) => r.mesVenda === null)!;

  const explicacao: string[] = [];
  explicacao.push(
    `A melhor opção simulada é ${rotuloMes(melhor.mesVenda)}: patrimônio de ${fmt(melhor.patrimonioFinalNoHorizonte)} no mês ${cenario.horizonteMeses}, contra ${fmt(piorEntreCandidatos.patrimonioFinalNoHorizonte)} da pior opção simulada (${rotuloMes(piorEntreCandidatos.mesVenda)}) — uma diferença de ${fmt(melhor.patrimonioFinalNoHorizonte - piorEntreCandidatos.patrimonioFinalNoHorizonte)}.`
  );
  if (melhor.mesVenda !== null) {
    const diffVsManter = melhor.patrimonioFinalNoHorizonte - manterAteFim.patrimonioFinalNoHorizonte;
    explicacao.push(
      diffVsManter >= 0
        ? `${rotuloMes(melhor.mesVenda)} supera "nunca vender" em ${fmt(diffVsManter)} — o capital líquido reciclado (${fmt(melhor.capitalReciclado)}) financiou ${melhor.eventos.filter((e) => e.tipo === 'reinvestimento').length} reinvestimento(s), levando a frota final a ${melhor.frotaFinalUnidades} veículo(s) contra ${manterAteFim.frotaFinalUnidades} de quem nunca vendeu.`
        : `Mesmo sendo a melhor entre as opções DE VENDA simuladas, ${rotuloMes(melhor.mesVenda)} ainda fica ${fmt(Math.abs(diffVsManter))} abaixo de "nunca vender" neste cenário.`
    );
  } else {
    explicacao.push(`"Nunca vender" foi a melhor opção simulada — nenhum momento de venda testado gerou reciclagem de capital suficiente para superar manter o veículo até o fim do horizonte.`);
  }

  return { porMomento, melhorMesVenda: melhor.mesVenda, explicacao };
}
