import type { MesSimulado } from './simulacaoEmpresarial';

// Épico 3 — Central de Decisão Empresarial. Agrupa a simulação mês a mês (o motor sempre roda em
// meses — é a granularidade que faz sentido pro cálculo de juros/amortização) em linhas ANO a
// ano, pedido explícito do Carlos pro Fluxo Detalhado (Card, antes do gráfico de Fluxo de Caixa).
//
// "Despesas" aqui é só o custo operacional (seguro/IPVA/rastreador/lavagem/manutenção/
// licenciamento) — a mesma definição que o "Custos" da legenda do gráfico de Fluxo de Caixa
// (Card 2) já usa, sem incluir a parcela do financiamento. "Amortização da dívida" é a parte da
// parcela que reduziu o principal (programada + extraordinária, se houver — Card 4), separada
// dos juros de propósito porque juros é despesa de verdade e amortização não é (é dinheiro que
// vira patrimônio, não custo). "Lucro líquido" mantém a MESMA definição usada em todo o resto do
// módulo (receita menos TODAS as despesas, incluindo a parcela inteira) — não inventei uma
// segunda definição de lucro só pra essa tabela bater "bonito" com as outras colunas.
export type FluxoAnual = {
  rotulo: string;
  mesInicio: number;
  mesFim: number;
  mesesNoAno: number;
  anoIncompleto: boolean;
  entrada: number;
  despesas: number;
  amortizacaoDaDivida: number;
  saldoDaDivida: number;
  lucroLiquido: number;
  /** Quantos veículos foram comprados dentro desse ano — soma de comprasNoMes dos meses do período. Pedido do Carlos (2026-08-09): "quero ver o momento de compra dos carros no fluxo". */
  veiculosComprados: number;
  /** Caixa disponível no ÚLTIMO mês do período (saldo, não soma — mesmo tratamento que saldoDaDivida). */
  caixaFinal: number;
  /** Soma dos juros de investimento ganhos nos meses do período (2026-08-10, "juros do dinheiro aplicado"). */
  jurosInvestimento: number;
  /** Soma do IR pago nos meses do período. */
  ir: number;
};

export function agruparFluxoPorAno(meses: MesSimulado[]): FluxoAnual[] {
  const mesesOperacionais = meses.filter((m) => m.mes > 0);
  if (mesesOperacionais.length === 0) return [];

  const ultimoMes = mesesOperacionais[mesesOperacionais.length - 1].mes;
  const numAnos = Math.ceil(ultimoMes / 12);
  const anos: FluxoAnual[] = [];

  for (let ano = 1; ano <= numAnos; ano++) {
    const mesInicio = (ano - 1) * 12 + 1;
    const mesFim = Math.min(ano * 12, ultimoMes);
    const mesesDoAno = mesesOperacionais.filter((m) => m.mes >= mesInicio && m.mes <= mesFim);
    if (mesesDoAno.length === 0) continue;

    const entrada = mesesDoAno.reduce((acc, m) => acc + m.receitaMensal, 0);
    const despesas = mesesDoAno.reduce((acc, m) => acc + (m.despesaMensal - m.despesaBreakdown.parcelas), 0);
    const amortizacaoDaDivida = mesesDoAno.reduce((acc, m) => acc + m.amortizacaoProgramadaMensal + m.amortizacaoExtraMensal, 0);
    const lucroLiquido = mesesDoAno.reduce((acc, m) => acc + m.lucroMensal, 0);
    const saldoDaDivida = mesesDoAno[mesesDoAno.length - 1].saldoDevedorTotal;
    const anoIncompleto = mesesDoAno.length < 12;
    const veiculosComprados = mesesDoAno.reduce((acc, m) => acc + m.comprasNoMes, 0);
    const caixaFinal = mesesDoAno[mesesDoAno.length - 1].caixaDisponivel;
    const jurosInvestimento = mesesDoAno.reduce((acc, m) => acc + m.jurosInvestimentoMensal, 0);
    const ir = mesesDoAno.reduce((acc, m) => acc + m.irMensal, 0);

    anos.push({
      rotulo: anoIncompleto ? `Ano ${ano} (${mesesDoAno.length} meses)` : `Ano ${ano}`,
      mesInicio,
      mesFim,
      mesesNoAno: mesesDoAno.length,
      anoIncompleto,
      entrada,
      despesas,
      amortizacaoDaDivida,
      saldoDaDivida,
      lucroLiquido,
      veiculosComprados,
      caixaFinal,
      jurosInvestimento,
      ir,
    });
  }

  return anos;
}
