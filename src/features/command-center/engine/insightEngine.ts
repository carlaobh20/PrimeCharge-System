import type { EntityIntelligenceSnapshot, PrioritizedInsight } from '../types';
import { calcularPrioridade } from './priorityEngine';

// InsightEngine — consolida os Insights que cada feature já calculou por entidade. Insight é
// observação neutra (não pede ação nem indica problema), então fica sempre em impacto/
// urgência baixos — exceto quando a própria severidade já é "atencao" (ex.: desvalorização),
// que sobe um degrau. Desde a Sprint 7 (DEC-038), formato genérico — ver alertEngine.ts.
export function consolidarInsights(entidades: EntityIntelligenceSnapshot[]): PrioritizedInsight[] {
  return entidades.flatMap(({ origemTipo, origemId, origemLabel, hrefBase, insights }) =>
    insights.map((insight) => {
      const impacto = insight.severidade === 'atencao' ? 'medio' : 'baixo';
      const urgencia = 'baixa';
      return {
        ...insight,
        id: `${origemId}-${insight.id}`,
        impacto,
        urgencia,
        prioridade: calcularPrioridade(impacto, urgencia),
        origem: origemTipo,
        origemId,
        origemLabel,
        href: hrefBase,
      } satisfies PrioritizedInsight;
    })
  );
}
