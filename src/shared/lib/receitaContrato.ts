// Épico 4 — "Ativo Financeiro". Contrato guarda o valor no período que o motorista negociou
// (diária, semanal ou mensal) — pra comparar receita entre veículos com contratos de
// periodicidades diferentes (Yield, Painel de Caixa, Patrimônio), tudo precisa virar a mesma
// unidade. Escolhida a unidade mensal por ser a mais comum nos outros cálculos financeiros
// do sistema (financeiro/, estrategia/).
//
// Fatores de conversão: 365/12 dias por mês e 52/12 semanas por mês (médias de calendário,
// não "30 dias"/"4 semanas" arredondados) — mesmo padrão de precisão usado em
// licenciamentoMensalPorVeiculo (estrategia/intelligence), que já divide um valor anual por 12
// em vez de aproximar.
const DIAS_POR_MES = 365 / 12;
const SEMANAS_POR_MES = 52 / 12;

export type PeriodicidadeContrato = 'diaria' | 'semanal' | 'mensal';

export function calcularReceitaMensalEquivalente(valorPeriodico: number, periodicidade: PeriodicidadeContrato): number {
  switch (periodicidade) {
    case 'diaria':
      return valorPeriodico * DIAS_POR_MES;
    case 'semanal':
      return valorPeriodico * SEMANAS_POR_MES;
    case 'mensal':
      return valorPeriodico;
  }
}
