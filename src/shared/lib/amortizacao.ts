// Matemática de amortização de financiamento — extraída de
// features/estrategia/intelligence/simulacaoEmpresarial.ts (2026-08-10, Épico 4 "Ativo
// Financeiro") pra virar utilitário compartilhado: o simulador hipotético (/estrategia) só
// conhecia Price; agora o financiamento REAL de cada veículo (features/frota) também precisa
// dessa conta, e Carlos pediu explicitamente a opção Price/SAC. É fórmula financeira genérica,
// não lógica de nenhum dos dois domínios — não fazia sentido um depender do outro pra isso.

export type SistemaAmortizacao = 'price' | 'sac';

/** Parcela fixa da Tabela Price (sistema francês de amortização). */
export function calcularParcelaPrice(valorFinanciado: number, taxaAmPct: number, prazoMeses: number): number {
  if (prazoMeses <= 0 || valorFinanciado <= 0) return 0;
  const i = taxaAmPct / 100;
  if (i === 0) return valorFinanciado / prazoMeses;
  return (valorFinanciado * i) / (1 - Math.pow(1 + i, -prazoMeses));
}

export type LinhaAmortizacao = {
  /** 1-indexado — mês 1 é a primeira parcela, não o mês da compra. */
  mes: number;
  juros: number;
  amortizacao: number;
  parcela: number;
  saldoDevedor: number;
};

/**
 * Gera a tabela mês a mês (Price ou SAC) do início ao fim do financiamento.
 * Price: parcela fixa, juros decrescente, amortização crescente (calcularParcelaPrice).
 * SAC: amortização fixa (valorFinanciado / prazoMeses), juros e parcela decrescentes.
 * Genérica o bastante pra alimentar tanto o financiamento real por veículo (frota) quanto,
 * futuramente, qualquer outro lugar que precise da mesma conta.
 */
export function gerarTabelaAmortizacao(
  valorFinanciado: number,
  taxaAmPct: number,
  prazoMeses: number,
  sistema: SistemaAmortizacao
): LinhaAmortizacao[] {
  if (valorFinanciado <= 0 || prazoMeses <= 0) return [];

  const i = taxaAmPct / 100;
  const linhas: LinhaAmortizacao[] = [];
  let saldoDevedor = valorFinanciado;

  if (sistema === 'price') {
    const parcela = calcularParcelaPrice(valorFinanciado, taxaAmPct, prazoMeses);
    for (let mes = 1; mes <= prazoMeses; mes++) {
      const juros = saldoDevedor * i;
      const amortizacao = Math.min(parcela - juros, saldoDevedor);
      saldoDevedor = Math.max(0, saldoDevedor - amortizacao);
      linhas.push({ mes, juros, amortizacao, parcela: amortizacao + juros, saldoDevedor });
    }
  } else {
    const amortizacaoFixa = valorFinanciado / prazoMeses;
    for (let mes = 1; mes <= prazoMeses; mes++) {
      const juros = saldoDevedor * i;
      const amortizacao = Math.min(amortizacaoFixa, saldoDevedor);
      saldoDevedor = Math.max(0, saldoDevedor - amortizacao);
      linhas.push({ mes, juros, amortizacao, parcela: amortizacao + juros, saldoDevedor });
    }
  }

  return linhas;
}
