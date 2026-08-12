import { gerarTabelaAmortizacao, type LinhaAmortizacao } from '@/shared/lib/amortizacao';
import { SEMANAS_POR_MES } from '../../intelligence/simulacaoEmpresarial';
import type { CenarioDecisaoVenda, MesDecisaoVenda } from './comparadorMomentosDeVenda';

// Épico 10 — Fase 2, itens 9-19: MULTICICLO. A Fase 1 (`comparadorMomentosDeVenda.ts`) só sabe
// vender o veículo original 1 vez ("rodada única de reinvestimento", ver cabeçalho daquele
// arquivo). Este módulo prova a arquitetura de um 2º ciclo: os veículos comprados pelo
// reinvestimento (GERAÇÃO 2) também podem ser vendidos — mas só uma vez, e sem desencadear
// GERAÇÃO 3 (escopo explícito do item 11: "provar arquitetura", não um otimizador recursivo
// ilimitado — item 10 pede explicitamente para NÃO simular "tudo contra tudo").
//
// Por que um motor separado de `comparadorMomentosDeVenda.ts`, em vez de generalizar aquele:
// generalizar pra N gerações exigiria reescrever a Fase 1 inteira (que está validada 63/63) só
// pra provar 2 gerações — regra dos 3 aplicada ao contrário: a Fase 1 já é o caso concreto de "1
// geração"; este arquivo é o caso concreto de "2 gerações, com veículos idênticos e limite
// deliberado em geração 3". Se surgir necessidade real de N gerações arbitrárias, esse é o
// momento de unificar os dois num motor genérico — não antes, sem 3º caso concreto pedindo.
//
// DSCR (item 16): reutiliza o MESMO formato de gate de `crescimentoComposto.ts`
// (`tentarComprar` — NOI/parcelasProjetadas, comparado contra `dscr_minimo_atencao`) — não um
// import direto (a função lá é local ao closure daquele motor, não exportada), mas a mesma
// fórmula, documentada aqui para ficar auditável lado a lado.

const EPS = 1;

export type OpcoesCicloDeVenda = {
  mesVendaGeracao1: number | null;
  /** item 17 — permite isolar o efeito puro da venda (false) do efeito da reciclagem (true). */
  reinvestirGeracao1: boolean;
  /** Só tem efeito se `reinvestirGeracao1` gerou pelo menos 1 veículo de geração 2. */
  mesVendaGeracao2: number | null;
  /** Gate de dívida na compra de reposição — mesma fórmula de crescimentoComposto.ts. Default:
   * `dscr_minimo_atencao` já usado em produção no Motor de Expansão (ExpansaoDaFrota.tsx). */
  dscrMinimoAtencao: number;
};

export type EventoCiclo = {
  tipo: 'compra' | 'venda' | 'bloqueio_reserva' | 'bloqueio_dscr';
  mes: number;
  geracao: 1 | 2;
  veiculoId: string;
  /** Entrada paga (compra) ou valor bruto de venda (venda); 0 nos bloqueios. */
  valor: number;
  saldoDevedor: number | null;
  capitalLiberado: number | null;
  /** Caixa total imediatamente após este evento (venda ou compra) — usado pra provar que nenhuma compra viola a reserva mínima. null nos bloqueios (nada mudou o caixa). */
  caixaApos: number | null;
  novaAquisicao: boolean;
  descricao: string;
};

export type ResultadoCicloDeVenda = {
  opcoes: OpcoesCicloDeVenda;
  meses: MesDecisaoVenda[];
  eventos: EventoCiclo[];
  capitalLiberadoTotal: number;
  capitalUtilizadoTotal: number;
  /** Item 15 — "quanto do capital liberado por vendas nunca virou entrada de veículo novo",
   * nunca negativo por definição (`Math.max(0, liberado − utilizado)`). ACHADO da validação: o
   * reinvestimento usa o CAIXA TOTAL disponível no momento (que inclui lucro operacional
   * acumulado, não só o que a própria venda liberou) — é possível `capitalUtilizadoTotal >
   * capitalLiberadoTotal` (aconteceu no cenário de teste do mês 21: liberou R$60.220,94, usou
   * R$72.000,00 — a diferença veio de lucro operacional já em caixa, não de outra venda). Nesse
   * caso `capitalOciosoFinal` fica 0 (não fica negativo) e `capitalUtilizadoAlemDoLiberado`
   * documenta exatamente quanto veio de fora da reciclagem em si. */
  capitalOciosoFinal: number;
  capitalUtilizadoAlemDoLiberado: number;
  frotaFinalUnidades: number;
  frotaGeracao1Final: number;
  frotaGeracao2Final: number;
  patrimonioFinalNoHorizonte: number;
  caixaFinal: number;
  equityFinal: number;
};

type VeiculoCiclo = { id: string; geracao: 1 | 2; mesCompra: number; tabela: LinhaAmortizacao[]; vendido: boolean };

function parcelaNoMes(v: VeiculoCiclo, mes: number) {
  const r = mes - v.mesCompra;
  if (r < 1 || r > v.tabela.length) return { juros: 0, amortizacao: 0, parcela: 0 };
  const l = v.tabela[r - 1];
  return { juros: l.juros, amortizacao: l.amortizacao, parcela: l.parcela };
}

function saldoDevedorAntesDoMes(v: VeiculoCiclo, mes: number): number {
  const r = mes - v.mesCompra;
  if (v.tabela.length === 0) return 0;
  if (r <= 1) return v.tabela[0].saldoDevedor + v.tabela[0].amortizacao;
  if (r - 2 >= v.tabela.length) return 0;
  return v.tabela[r - 2].saldoDevedor;
}

function saldoDevedorFimDoMes(v: VeiculoCiclo, mes: number): number {
  const r = mes - v.mesCompra;
  if (v.tabela.length === 0) return 0;
  if (r < 1) return v.tabela[0].saldoDevedor + v.tabela[0].amortizacao;
  if (r > v.tabela.length) return 0;
  return v.tabela[r - 1].saldoDevedor;
}

export function simularCicloDeVenda(cenario: CenarioDecisaoVenda, opcoes: OpcoesCicloDeVenda): ResultadoCicloDeVenda {
  const custoMensal = cenario.seguroMensalPorVeiculo + cenario.ipvaAnualPorVeiculo / 12 + cenario.rastreadorMensalPorVeiculo + cenario.manutencaoPorKm * cenario.kmMensal;
  const receitaMensal = cenario.aluguelSemanalPorVeiculo * SEMANAS_POR_MES * (cenario.ocupacaoPct / 100);
  const valorFinanciadoPadrao = Math.max(0, cenario.precoVeiculo - cenario.entrada);
  const tabelaPadrao = () => gerarTabelaAmortizacao(valorFinanciadoPadrao, cenario.taxaJurosAmPct, cenario.prazoFinanciamentoMeses, cenario.sistemaAmortizacao);

  let proximoIdG2 = 1;
  const veiculos: VeiculoCiclo[] = [{ id: 'G1-original', geracao: 1, mesCompra: 0, tabela: tabelaPadrao(), vendido: false }];

  const eventos: EventoCiclo[] = [];
  const meses: MesDecisaoVenda[] = [];

  let caixa = 0;
  let capitalLiberadoTotal = 0;
  let capitalUtilizadoTotal = 0;

  function ativos(): VeiculoCiclo[] {
    return veiculos.filter((v) => !v.vendido);
  }

  /** Mesma fórmula de gate de crescimentoComposto.ts (`tentarComprar`): reserva mínima + DSCR
   * projetado do próximo mês incluindo o veículo candidato. */
  function podeComprar(mes: number): { pode: boolean; motivo?: 'reserva' | 'dscr'; dscrProjetado?: number } {
    const custoMinimo = cenario.entrada + cenario.reservaMinima;
    if (caixa + EPS < custoMinimo) return { pode: false, motivo: 'reserva' };
    const ativosAtuais = ativos();
    const parcelasAtivasProjetadas = ativosAtuais.reduce((s, v) => s + parcelaNoMes(v, mes + 1).parcela, 0);
    const parcelaPrimeiraDoNovo = tabelaPadrao()[0]?.parcela ?? 0;
    const noiAtual = ativosAtuais.length * (receitaMensal - custoMensal);
    const noiProjetado = noiAtual + (receitaMensal - custoMensal);
    const parcelasProjetadas = parcelasAtivasProjetadas + parcelaPrimeiraDoNovo;
    const dscrProjetado = parcelasProjetadas > 0 ? noiProjetado / parcelasProjetadas : null;
    if (dscrProjetado !== null && dscrProjetado < opcoes.dscrMinimoAtencao) return { pode: false, motivo: 'dscr', dscrProjetado };
    return { pode: true };
  }

  function venderGeracao(gerAlvo: 1 | 2, mes: number, permiteReinvestir: boolean) {
    const candidatos = ativos().filter((v) => v.geracao === gerAlvo);
    if (candidatos.length === 0) return;
    let houveNovaAquisicaoNesteMes = false;
    const idsVendidosAgora: string[] = [];
    for (const v of candidatos) {
      const saldoDevedor = saldoDevedorAntesDoMes(v, mes);
      const custosVenda = cenario.valorVenda * (cenario.vendaCustosPct / 100);
      const liquido = Math.max(0, cenario.valorVenda - saldoDevedor - custosVenda);
      caixa += liquido;
      capitalLiberadoTotal += liquido;
      v.vendido = true;
      idsVendidosAgora.push(v.id);
      eventos.push({
        tipo: 'venda',
        mes,
        geracao: gerAlvo,
        veiculoId: v.id,
        valor: cenario.valorVenda,
        saldoDevedor,
        capitalLiberado: liquido,
        caixaApos: caixa,
        novaAquisicao: false, // corrigido abaixo se uma compra de fato acontecer neste mês
        descricao: `${v.id} (geração ${gerAlvo}) vendido por ${fmt(cenario.valorVenda)} no mês ${mes}. Saldo devedor ${fmt(saldoDevedor)}, custos de venda ${fmt(custosVenda)}, capital liberado ${fmt(liquido)}.`,
      });
    }

    if (permiteReinvestir) {
      const geracaoDosNovos = gerAlvo === 1 ? 2 : null; // "não permitir geração 3" (item 11) — venda de geração 2 nunca reinveste.
      if (geracaoDosNovos !== null) {
        for (;;) {
          const check = podeComprar(mes);
          if (!check.pode) {
            eventos.push({
              tipo: check.motivo === 'reserva' ? 'bloqueio_reserva' : 'bloqueio_dscr',
              mes,
              geracao: geracaoDosNovos,
              veiculoId: `G2-candidato-${proximoIdG2}`,
              valor: 0,
              saldoDevedor: null,
              capitalLiberado: null,
              caixaApos: null,
              novaAquisicao: false,
              descricao:
                check.motivo === 'reserva'
                  ? `Compra bloqueada no mês ${mes}: caixa (${fmt(caixa)}) não cobre entrada + reserva mínima (${fmt(cenario.entrada + cenario.reservaMinima)}).`
                  : `Compra bloqueada no mês ${mes}: DSCR projetado (${check.dscrProjetado?.toFixed(2)}×) abaixo do mínimo de atenção (${opcoes.dscrMinimoAtencao.toFixed(2)}×).`,
            });
            break;
          }
          caixa -= cenario.entrada;
          capitalUtilizadoTotal += cenario.entrada;
          const id = `G2-${proximoIdG2++}`;
          veiculos.push({ id, geracao: geracaoDosNovos, mesCompra: mes, tabela: tabelaPadrao(), vendido: false });
          houveNovaAquisicaoNesteMes = true;
          eventos.push({
            tipo: 'compra',
            mes,
            geracao: geracaoDosNovos,
            veiculoId: id,
            valor: cenario.entrada,
            saldoDevedor: null,
            capitalLiberado: null,
            caixaApos: caixa,
            novaAquisicao: true,
            descricao: `${id} (geração ${geracaoDosNovos}) comprado no mês ${mes} com capital reciclado. Entrada ${fmt(cenario.entrada)}.`,
          });
        }
      }
    }

    if (houveNovaAquisicaoNesteMes) {
      for (const ev of eventos) {
        if (ev.tipo === 'venda' && ev.mes === mes && idsVendidosAgora.includes(ev.veiculoId)) ev.novaAquisicao = true;
      }
    }
  }

  for (let mes = 0; mes <= cenario.horizonteMeses; mes++) {
    if (opcoes.mesVendaGeracao1 !== null && mes === opcoes.mesVendaGeracao1) {
      venderGeracao(1, mes, opcoes.reinvestirGeracao1);
    }
    if (opcoes.mesVendaGeracao2 !== null && mes === opcoes.mesVendaGeracao2) {
      venderGeracao(2, mes, false); // item 11 — geração 2 nunca desencadeia geração 3.
    }

    const listaAtivos = ativos();
    const receita = listaAtivos.length * receitaMensal;
    const custosOperacionais = listaAtivos.length * custoMensal;
    let jurosDoMes = 0;
    let amortizacaoDoMes = 0;
    for (const v of listaAtivos) {
      const p = parcelaNoMes(v, mes);
      jurosDoMes += p.juros;
      amortizacaoDoMes += p.amortizacao;
    }
    caixa += receita - custosOperacionais - (jurosDoMes + amortizacaoDoMes);

    const saldoDevedorTotal = listaAtivos.reduce((s, v) => s + saldoDevedorFimDoMes(v, mes), 0);
    const equity = listaAtivos.length * cenario.precoVeiculo - saldoDevedorTotal;
    const patrimonio = caixa + equity;

    meses.push({ mes, frotaAtiva: listaAtivos.length, receita, custosOperacionais, jurosDoMes, amortizacaoDoMes, saldoDevedor: saldoDevedorTotal, caixa, equity, patrimonio });
  }

  const mesFinal = meses[meses.length - 1];
  const frotaFinal = ativos();
  return {
    opcoes,
    meses,
    eventos,
    capitalLiberadoTotal,
    capitalUtilizadoTotal,
    // Item 15 — "capital ocioso": a PARTE do capital liberado por vendas que nunca virou entrada
    // de veículo novo — nunca negativo (ver `capitalUtilizadoAlemDoLiberado` pro caso em que o
    // reinvestimento usou mais do que a venda liberou, coberto por lucro operacional).
    capitalOciosoFinal: Math.max(0, capitalLiberadoTotal - capitalUtilizadoTotal),
    capitalUtilizadoAlemDoLiberado: Math.max(0, capitalUtilizadoTotal - capitalLiberadoTotal),
    frotaFinalUnidades: frotaFinal.length,
    frotaGeracao1Final: frotaFinal.filter((v) => v.geracao === 1).length,
    frotaGeracao2Final: frotaFinal.filter((v) => v.geracao === 2).length,
    patrimonioFinalNoHorizonte: mesFinal.patrimonio,
    caixaFinal: mesFinal.caixa,
    equityFinal: mesFinal.equity,
  };
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------------------------------------------------------------------------------------------
// Épico 10 — Fase 2.1: GRADE COMPLETA de geração 1 × geração 2 (a Fase 2 só validou 1 par
// representativo, M12→M24 — "primeiro validar o fluxo", item 13 da Fase 2). Mecânico a partir
// daqui: só chama `simularCicloDeVenda` pra cada combinação temporalmente válida (2ª venda >
// 1ª venda) — nenhuma matemática nova.
// ---------------------------------------------------------------------------------------------

export type PontoGrade = {
  mesVendaGeracao1: number;
  /** null = variante "geração 1 vende, geração 2 nunca vende" — incluída como baseline de
   * comparação pra cada candidato de 1ª venda, não só os pares com 2ª venda. */
  mesVendaGeracao2: number | null;
  patrimonioFinalNoHorizonte: number;
  frotaFinalUnidades: number;
  frotaGeracao2Final: number;
  capitalLiberadoTotal: number;
  capitalUtilizadoTotal: number;
  capitalOciosoFinal: number;
};

/**
 * Varre todas as combinações temporalmente válidas (`mesVendaGeracao2 > mesVendaGeracao1`) entre
 * `candidatosG1` e `candidatosG2`, mais 1 baseline "geração 2 nunca vende" por candidato de G1.
 */
export function varrerGradeDeVendas(cenario: CenarioDecisaoVenda, candidatosG1: number[], candidatosG2: number[], dscrMinimoAtencao: number): PontoGrade[] {
  const resultados: PontoGrade[] = [];
  const extrair = (r: ResultadoCicloDeVenda, m1: number, m2: number | null): PontoGrade => ({
    mesVendaGeracao1: m1,
    mesVendaGeracao2: m2,
    patrimonioFinalNoHorizonte: r.patrimonioFinalNoHorizonte,
    frotaFinalUnidades: r.frotaFinalUnidades,
    frotaGeracao2Final: r.frotaGeracao2Final,
    capitalLiberadoTotal: r.capitalLiberadoTotal,
    capitalUtilizadoTotal: r.capitalUtilizadoTotal,
    capitalOciosoFinal: r.capitalOciosoFinal,
  });

  for (const m1 of candidatosG1) {
    const semVendaG2 = simularCicloDeVenda(cenario, { mesVendaGeracao1: m1, reinvestirGeracao1: true, mesVendaGeracao2: null, dscrMinimoAtencao });
    resultados.push(extrair(semVendaG2, m1, null));
    for (const m2 of candidatosG2) {
      if (m2 <= m1) continue; // só combinações temporalmente válidas.
      const r = simularCicloDeVenda(cenario, { mesVendaGeracao1: m1, reinvestirGeracao1: true, mesVendaGeracao2: m2, dscrMinimoAtencao });
      resultados.push(extrair(r, m1, m2));
    }
  }
  return resultados;
}
