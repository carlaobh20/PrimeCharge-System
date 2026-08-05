import type { VeiculoIntelligenceSnapshot } from '../services/fleetIntelligenceCollector';
import type { PrioritizedInsight } from '../types';
import { calcularPrioridade } from './priorityEngine';

// InsightEngine — consolida os Insights que Vehicle Intelligence já calculou por veículo.
// Insight é observação neutra (não pede ação nem indica problema), então fica sempre em
// impacto/urgência baixos — exceto quando a própria severidade já é "atencao" (ex.:
// desvalorização), que sobe um degrau.
export function consolidarInsights(frota: VeiculoIntelligenceSnapshot[]): PrioritizedInsight[] {
  return frota.flatMap(({ veiculo, insights }) =>
    insights.map((insight) => {
      const impacto = insight.severidade === 'atencao' ? 'medio' : 'baixo';
      const urgencia = 'baixa';
      return {
        ...insight,
        id: `${veiculo.id}-${insight.id}`,
        impacto,
        urgencia,
        prioridade: calcularPrioridade(impacto, urgencia),
        origem: 'veiculo',
        origemId: veiculo.id,
        origemLabel: veiculo.placa,
      } satisfies PrioritizedInsight;
    })
  );
}
