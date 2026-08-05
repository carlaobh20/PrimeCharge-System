export type RoiResult = {
  roiPercentual: number | null;
  motivos: string[];
};

/**
 * ROI sobre investimento — cálculo real (lucro / valor investido), não um motor de projeção.
 * `valorInvestido` vem de fora (ex.: veiculo.valor_compra) porque esta pasta não importa
 * `frota`/`contracts`/`motoristas` diretamente (DEC-048 é uma exceção de leitura para o
 * sentido contrário — Intelligence de outra feature lendo Financeiro, não o inverso).
 *
 * Honestidade (DEC-022): sem valor investido conhecido, o ROI fica null — nunca um percentual
 * calculado sobre uma base inventada.
 */
export function calcularRoi(lucroConfirmado: number, valorInvestido: number | null): RoiResult {
  if (valorInvestido === null || valorInvestido === 0) {
    return { roiPercentual: null, motivos: ['Valor investido desconhecido ou zero — ROI não calculável.'] };
  }

  const roiPercentual = Math.round((lucroConfirmado / valorInvestido) * 10000) / 100;
  return { roiPercentual, motivos: [] };
}

// Depreciação (curva real por uso/estado), receita perdida por vacância, e "valor gerado por
// automação/Agente/IA" (DEC-049) NÃO são implementados nesta sprint — dependem de dado que
// ainda não existe em volume real (telemetria, histórico de Agente) ou de uma entidade que
// esta sprint deliberadamente não construiu (Vacância, ARQUITETURA.md Fase 4). O schema desta
// sprint (dimensões em `lancamentos`, `criado_via`) já deixa espaço para os três sem redesenho
// — ver DEC-049 e DEC-052 no DECISION_LOG.md.
