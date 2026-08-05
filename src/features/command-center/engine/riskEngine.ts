import type { VeiculoIntelligenceSnapshot } from '../services/fleetIntelligenceCollector';
import type { PrioritizedRisk } from '../types';
import { calcularPrioridade } from './priorityEngine';

// RiskEngine — desde a Sprint 6 (DEC-025), não calcula mais a regra em si (isso mudou pra
// features/frota/intelligence/risks.ts). Só consolida e prioriza.
export function consolidarRiscos(frota: VeiculoIntelligenceSnapshot[]): PrioritizedRisk[] {
  return frota.flatMap(({ veiculo, riscos }) =>
    riscos.map((risco) => {
      const impacto = 'alto';
      const urgencia = 'alta';
      return {
        ...risco,
        id: `${veiculo.id}-${risco.id}`,
        impacto,
        urgencia,
        prioridade: calcularPrioridade(impacto, urgencia),
        origem: 'veiculo',
        origemId: veiculo.id,
        origemLabel: veiculo.placa,
      } satisfies PrioritizedRisk;
    })
  );
}
