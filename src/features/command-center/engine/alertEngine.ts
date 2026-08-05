import type { VeiculoIntelligenceSnapshot } from '../services/fleetIntelligenceCollector';
import type { PrioritizedAlerta } from '../types';
import { calcularPrioridade } from './priorityEngine';

// AlertEngine — não recalcula nada: consolida os Alertas que Vehicle Intelligence já
// calculou por veículo (DEC-022) e atribui Impacto/Urgência/Prioridade/Origem (DEC-024).
// Regra de prioridade: alerta crítico é sempre impacto alto + urgência alta (crítica); os
// demais (hoje só "atencao") são impacto/urgência médios.
export function consolidarAlertas(frota: VeiculoIntelligenceSnapshot[]): PrioritizedAlerta[] {
  return frota.flatMap(({ veiculo, alertas }) =>
    alertas.map((alerta) => {
      const impacto = alerta.severidade === 'critico' ? 'alto' : 'medio';
      const urgencia = alerta.severidade === 'critico' ? 'alta' : 'media';
      return {
        ...alerta,
        id: `${veiculo.id}-${alerta.id}`,
        impacto,
        urgencia,
        prioridade: calcularPrioridade(impacto, urgencia),
        origem: 'veiculo',
        origemId: veiculo.id,
        origemLabel: veiculo.placa,
      } satisfies PrioritizedAlerta;
    })
  );
}
