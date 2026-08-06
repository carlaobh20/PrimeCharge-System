// Investment Simulator — Missão 3 (fundação, Parte 9), 2026-08-06.
//
// "Melhor solução" registrada no relatório desta missão: o pedido original imaginava um
// módulo novo do zero. Mas `financeiro/intelligence/roi.ts` (`calcularRoi`) e
// `resumoFinanceiro.ts` (`calcularResumoFinanceiro`) já existiam desde a Sprint 8 com
// exatamente o cálculo de ROI/lucro que um simulador precisaria — e não tinham nenhum
// consumidor em lugar nenhum da aplicação (achado desta missão). Em vez de duplicar a lógica,
// este arquivo só acrescenta o que ainda não existia (custo por KM, payback) e tudo é
// conectado à UI pela primeira vez nesta missão.
//
// Cálculos completos de TIR (taxa interna de retorno real, com fluxo de caixa mês a mês) e
// "vale comprar ou alugar / vale trocar" não são implementados aqui — dependem de premissas
// de negócio (taxa de desconto, cenário de revenda) que ninguém definiu ainda; construir a
// fórmula sem essas premissas seria inventar dado, o que este projeto rejeita desde DEC-022.
// O que existe aqui já responde, com dado real, as perguntas mais simples e imediatas: "este
// veículo específico está dando lucro?" e "quanto custa rodar cada KM dele?".

export type CustoPorKmResult = {
  valor: number | null;
  motivo: string;
};

export function calcularCustoPorKm(despesaConfirmada: number, kmRodado: number | null): CustoPorKmResult {
  if (kmRodado === null || kmRodado <= 0) {
    return { valor: null, motivo: 'Sem quilometragem rodada registrada ainda (depende de contratos encerrados com KM final preenchido).' };
  }
  return { valor: Math.round((despesaConfirmada / kmRodado) * 100) / 100, motivo: `${kmRodado} km rodados, ${despesaConfirmada.toFixed(2)} em despesa confirmada.` };
}

export type PaybackResult = {
  meses: number | null;
  motivo: string;
};

/**
 * Estimativa simples (linear, não fluxo de caixa descontado): quantos meses ao ritmo atual
 * de lucro mensal médio seriam necessários para recuperar o valor investido. `mesesDeOperacao`
 * precisa ser >= 1 para a média fazer sentido.
 */
export function calcularPaybackMeses(valorInvestido: number | null, lucroConfirmadoAcumulado: number, mesesDeOperacao: number): PaybackResult {
  if (valorInvestido === null || valorInvestido === 0) {
    return { meses: null, motivo: 'Valor investido desconhecido — payback não calculável.' };
  }
  if (mesesDeOperacao < 1 || lucroConfirmadoAcumulado <= 0) {
    return { meses: null, motivo: 'Sem lucro confirmado suficiente ainda para estimar payback.' };
  }
  const lucroMedioMensal = lucroConfirmadoAcumulado / mesesDeOperacao;
  return { meses: Math.round(valorInvestido / lucroMedioMensal), motivo: `Lucro médio mensal de ${lucroMedioMensal.toFixed(2)}, em ${mesesDeOperacao} mês(es) de operação.` };
}
