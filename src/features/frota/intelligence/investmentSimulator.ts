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

export type CapitalRecuperadoResult = {
  capitalInvestido: number | null;
  capitalRecuperado: number;
  capitalRestante: number | null;
  percentualRecuperado: number | null;
};

// Épico 4 — "Ativo Financeiro", Parte 3. Mesmo par (valorInvestido = valor_compra,
// lucroConfirmadoAcumulado) que já alimenta ROI e Payback acima — "capital recuperado" é só
// outra leitura do mesmo lucro confirmado: quanto dele já cobriu o que foi gasto pra comprar o
// veículo. Usa LUCRO (receita − despesa), não receita bruta — despesa de operação também é
// dinheiro saindo, não fica disponível pra "recuperar" o capital investido.
export function calcularCapitalRecuperado(valorInvestido: number | null, lucroConfirmadoAcumulado: number): CapitalRecuperadoResult {
  if (valorInvestido === null || valorInvestido <= 0) {
    return { capitalInvestido: valorInvestido, capitalRecuperado: 0, capitalRestante: null, percentualRecuperado: null };
  }
  const capitalRecuperado = Math.max(0, Math.min(lucroConfirmadoAcumulado, valorInvestido));
  const capitalRestante = Math.max(0, valorInvestido - capitalRecuperado);
  const percentualRecuperado = Math.round((capitalRecuperado / valorInvestido) * 1000) / 10;
  return { capitalInvestido: valorInvestido, capitalRecuperado, capitalRestante, percentualRecuperado };
}

export type ValorPorUnidadeResult = { valor: number | null; motivo: string };

// Épico 4 — "FROTA", Fase A.5. Mesmo racional de calcularCustoPorKm acima: "quanto cada km/dia
// rendeu de lucro", não só "quanto custou". Reaproveita o mesmo lucroConfirmadoAcumulado que já
// alimenta ROI/Payback/Capital Recuperado — nenhum cálculo de lucro novo, só nova divisão.
export function calcularLucroPorKm(lucroConfirmadoAcumulado: number, kmRodado: number | null): ValorPorUnidadeResult {
  if (kmRodado === null || kmRodado <= 0) {
    return { valor: null, motivo: 'Sem quilometragem rodada registrada ainda.' };
  }
  return { valor: Math.round((lucroConfirmadoAcumulado / kmRodado) * 100) / 100, motivo: `${kmRodado} km rodados.` };
}

export function calcularLucroPorDia(lucroConfirmadoAcumulado: number, diasNaFrota: number | null): ValorPorUnidadeResult {
  if (diasNaFrota === null || diasNaFrota <= 0) {
    return { valor: null, motivo: 'Sem dias suficientes na frota para calcular ainda.' };
  }
  return { valor: Math.round((lucroConfirmadoAcumulado / diasNaFrota) * 100) / 100, motivo: `${diasNaFrota} dias na frota.` };
}

export type RoaResult = { percentual: number | null; motivo: string };

// ROA (Return on Assets) — diferente de ROI (calcularRoi, financeiro/intelligence/roi.ts): ROI
// mede retorno sobre o CAPITAL INVESTIDO na compra (valor_compra, histórico e fixo); ROA mede
// retorno sobre o VALOR ATUAL do ativo (resolverValorAtualVeiculo — muda com depreciação/
// mercado). Os dois respondem perguntas diferentes: "o que paguei valeu a pena" (ROI) vs "o
// que esse ativo vale hoje está rendendo bem" (ROA).
export function calcularRoa(lucroConfirmadoAcumulado: number, valorAtivoAtual: number | null): RoaResult {
  if (valorAtivoAtual === null || valorAtivoAtual <= 0) {
    return { percentual: null, motivo: 'Valor atual do ativo desconhecido — ROA não calculável.' };
  }
  return {
    percentual: Math.round((lucroConfirmadoAcumulado / valorAtivoAtual) * 10000) / 100,
    motivo: `Lucro confirmado sobre valor atual de ${valorAtivoAtual.toFixed(2)}.`,
  };
}
