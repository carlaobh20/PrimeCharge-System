import type { EntityIntelligenceSnapshot, PrioritizedRisk } from '../types';
import { calcularPrioridade } from './priorityEngine';

// RiskEngine — desde a Sprint 6 (DEC-025), não calcula mais a regra em si (gerarRiscos é
// 100% genérica, mora em shared/intelligence/risks.ts). Só consolida e prioriza. Desde a
// Sprint 7 (DEC-038), formato genérico — ver alertEngine.ts.
export function consolidarRiscos(entidades: EntityIntelligenceSnapshot[]): PrioritizedRisk[] {
  return entidades.flatMap(({ origemTipo, origemId, origemLabel, riscos }) =>
    riscos.map((risco) => {
      const impacto = 'alto';
      const urgencia = 'alta';
      return {
        ...risco,
        id: `${origemId}-${risco.id}`,
        impacto,
        urgencia,
        prioridade: calcularPrioridade(impacto, urgencia),
        origem: origemTipo,
        origemId,
        origemLabel,
      } satisfies PrioritizedRisk;
    })
  );
}
