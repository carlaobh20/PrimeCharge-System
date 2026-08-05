import type { EntityIntelligenceSnapshot, PrioritizedOpportunity } from '../types';
import { calcularPrioridade } from './priorityEngine';

// OpportunityEngine — desde a Sprint 6 (DEC-025), não calcula mais a regra em si (isso mora
// em cada features/<x>/intelligence/opportunities.ts). Só consolida o que cada entidade já
// calculou e prioriza. Desde a Sprint 7 (DEC-038), formato genérico — ver alertEngine.ts.
export function consolidarOportunidades(entidades: EntityIntelligenceSnapshot[]): PrioritizedOpportunity[] {
  return entidades.flatMap(({ origemTipo, origemId, origemLabel, oportunidades }) =>
    oportunidades.map((oportunidade) => {
      const impacto = 'alto';
      const urgencia = 'baixa';
      return {
        ...oportunidade,
        id: `${origemId}-oportunidade-${oportunidade.id}`,
        impacto,
        urgencia,
        prioridade: calcularPrioridade(impacto, urgencia),
        origem: origemTipo,
        origemId,
        origemLabel,
      } satisfies PrioritizedOpportunity;
    })
  );
}
