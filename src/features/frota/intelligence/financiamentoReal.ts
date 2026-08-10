// Épico 4 — "Ativo Financeiro", Parte 1/2 (2026-08-10). Financiamento REAL de um veículo —
// diferente de features/estrategia (cenário hipotético da empresa inteira), aqui é o
// financiamento de UM veículo real, a partir do que foi salvo no cadastro dele (Parte 1).
//
// Honestidade de dado: se o veículo não tem tipo_aquisicao com financiamento, ou não tem os
// campos mínimos preenchidos (valor_financiado/taxa/prazo/sistema/primeiro vencimento), retorna
// `null` — nunca inventa um financiamento que não foi cadastrado.

import { gerarTabelaAmortizacao, type LinhaAmortizacao } from '@/shared/lib/amortizacao';
import { TIPOS_AQUISICAO_COM_FINANCIAMENTO, type Veiculo } from '../types';

export type ResumoFinanciamentoReal = {
  tabela: LinhaAmortizacao[];
  /** Quantas parcelas já venceram até hoje — 0 se ainda não começou, `prazoMeses` se já quitado. */
  mesesDecorridos: number;
  saldoDevedorAtual: number;
  /** Próxima parcela a vencer (ou a última, se já quitado). Null se já quitado. */
  parcelaAtual: number | null;
  totalPago: number;
  totalJurosPago: number;
  totalAmortizado: number;
  /** Data prevista da última parcela — sempre calculada, nunca guardada (ver migration 0020). */
  quitacaoPrevista: string;
  quitado: boolean;
};

function somarMeses(dataIso: string, meses: number): Date {
  const d = new Date(dataIso + 'T00:00:00');
  d.setMonth(d.getMonth() + meses);
  return d;
}

function mesesEntre(inicioIso: string, hoje: Date): number {
  const inicio = new Date(inicioIso + 'T00:00:00');
  const diffMeses = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth());
  return Math.max(0, diffMeses + (hoje.getDate() >= inicio.getDate() ? 1 : 0));
}

/** `hoje` é injetável só pra teste determinístico — em produção sempre `new Date()`. */
export function calcularResumoFinanciamentoReal(veiculo: Veiculo, hoje: Date = new Date()): ResumoFinanciamentoReal | null {
  if (!TIPOS_AQUISICAO_COM_FINANCIAMENTO.includes(veiculo.tipo_aquisicao)) return null;
  if (
    !veiculo.valor_financiado ||
    veiculo.valor_financiado <= 0 ||
    !veiculo.taxa_juros_am_pct ||
    !veiculo.prazo_financiamento_meses ||
    veiculo.prazo_financiamento_meses <= 0 ||
    !veiculo.sistema_amortizacao ||
    !veiculo.primeiro_vencimento_financiamento
  ) {
    return null;
  }

  const tabela = gerarTabelaAmortizacao(
    veiculo.valor_financiado,
    veiculo.taxa_juros_am_pct,
    veiculo.prazo_financiamento_meses,
    veiculo.sistema_amortizacao
  );
  if (tabela.length === 0) return null;

  const mesesDecorridos = Math.min(
    mesesEntre(veiculo.primeiro_vencimento_financiamento, hoje),
    veiculo.prazo_financiamento_meses
  );
  const quitado = mesesDecorridos >= veiculo.prazo_financiamento_meses;

  const linhasVencidas = tabela.slice(0, mesesDecorridos);
  const totalPago = linhasVencidas.reduce((soma, l) => soma + l.parcela, 0);
  const totalJurosPago = linhasVencidas.reduce((soma, l) => soma + l.juros, 0);
  const totalAmortizado = linhasVencidas.reduce((soma, l) => soma + l.amortizacao, 0);
  const saldoDevedorAtual = quitado ? 0 : tabela[Math.max(0, mesesDecorridos - 1)]?.saldoDevedor ?? veiculo.valor_financiado;
  const parcelaAtual = quitado ? null : tabela[mesesDecorridos]?.parcela ?? tabela[mesesDecorridos - 1]?.parcela ?? null;

  // Fatia só a parte da data (YYYY-MM-DD) — formatDataSimples espera esse formato "puro", igual
  // toda coluna `date` do Postgres chega no front; toISOString() sozinho devolveria também
  // hora/timezone e quebraria a formatação (ex. "15T00:00:00.000Z/01/2029").
  const quitacaoPrevista = somarMeses(
    veiculo.primeiro_vencimento_financiamento,
    veiculo.prazo_financiamento_meses - 1
  )
    .toISOString()
    .slice(0, 10);

  return {
    tabela,
    mesesDecorridos,
    saldoDevedorAtual,
    parcelaAtual,
    totalPago,
    totalJurosPago,
    totalAmortizado,
    quitacaoPrevista,
    quitado,
  };
}

/**
 * Quanto de juros restante seria economizado se, HOJE, uma amortização extra de `valorExtra`
 * fosse aplicada — recalcula a tabela restante com o saldo reduzido, mesma taxa/sistema/prazo
 * remanescente, e compara os juros futuros antes/depois. Usado no Fluxo do Financiamento (Parte 2).
 */
export function calcularEconomiaAmortizarExtra(veiculo: Veiculo, valorExtra: number, hoje: Date = new Date()): number {
  const resumo = calcularResumoFinanciamentoReal(veiculo, hoje);
  if (!resumo || resumo.quitado || valorExtra <= 0) return 0;

  const prazoRestante = veiculo.prazo_financiamento_meses! - resumo.mesesDecorridos;
  if (prazoRestante <= 0) return 0;

  const jurosFuturosSemExtra = resumo.tabela.slice(resumo.mesesDecorridos).reduce((soma, l) => soma + l.juros, 0);

  const saldoComExtra = Math.max(0, resumo.saldoDevedorAtual - valorExtra);
  const tabelaComExtra = gerarTabelaAmortizacao(saldoComExtra, veiculo.taxa_juros_am_pct!, prazoRestante, veiculo.sistema_amortizacao!);
  const jurosFuturosComExtra = tabelaComExtra.reduce((soma, l) => soma + l.juros, 0);

  return Math.max(0, jurosFuturosSemExtra - jurosFuturosComExtra);
}

/** Economia total de juros se o saldo devedor inteiro for quitado hoje, de uma vez. */
export function calcularEconomiaQuitarHoje(veiculo: Veiculo, hoje: Date = new Date()): number {
  const resumo = calcularResumoFinanciamentoReal(veiculo, hoje);
  if (!resumo || resumo.quitado) return 0;
  return resumo.tabela.slice(resumo.mesesDecorridos).reduce((soma, l) => soma + l.juros, 0);
}
