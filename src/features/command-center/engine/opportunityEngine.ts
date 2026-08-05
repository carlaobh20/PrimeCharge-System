import type { VeiculoIntelligenceSnapshot } from '../services/fleetIntelligenceCollector';
import type { PrioritizedOpportunity } from '../types';
import { calcularPrioridade } from './priorityEngine';

// OpportunityEngine — desde a Sprint 6 (DEC-025), não calcula mais a regra em si (isso
// mudou pra features/frota/intelligence/opportunities.ts, mesmo padrão de Alert/Insight/
// ActionEngine desde a Sprint 5). Só consolida o que cada veículo já calculou e prioriza.
export function consolidarOportunidades(frota: VeiculoIntelligenceSnapshot[]): PrioritizedOpportunity[] {
  return frota.flatMap(({ veiculo, oportunidades }) =>
    oportunidades.map((oportunidade) => {
      const impacto = 'alto';
      const urgencia = 'baixa';
      return {
        ...oportunidade,
        id: `${veiculo.id}-oportunidade-${oportunidade.id}`,
        impacto,
        urgencia,
        prioridade: calcularPrioridade(impacto, urgencia),
        origem: 'veiculo',
        origemId: veiculo.id,
        origemLabel: veiculo.placa,
      } satisfies PrioritizedOpportunity;
    })
  );
}
