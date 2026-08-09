import type { EntityIntelligenceSnapshot, PrioritizedAlerta } from '../types';
import { calcularPrioridade } from './priorityEngine';

// AlertEngine — não recalcula nada: consolida os Alertas que cada feature já calculou por
// entidade (Vehicle/Driver/Contract Intelligence) e atribui Impacto/Urgência/Prioridade/
// Origem (DEC-024). Desde a Sprint 7 (DEC-038) recebe o formato genérico
// EntityIntelligenceSnapshot — não conhece mais "veículo" especificamente, então o mesmo
// engine consolida Veículos, Motoristas e Contratos sem duplicação. Regra de prioridade:
// alerta crítico é sempre impacto alto + urgência alta (crítica); os demais (hoje só
// "atencao") são impacto/urgência médios.
export function consolidarAlertas(entidades: EntityIntelligenceSnapshot[]): PrioritizedAlerta[] {
  return entidades.flatMap(({ origemTipo, origemId, origemLabel, hrefBase, alertas }) =>
    alertas.map((alerta) => {
      const impacto = alerta.severidade === 'critico' ? 'alto' : 'medio';
      const urgencia = alerta.severidade === 'critico' ? 'alta' : 'media';
      return {
        ...alerta,
        id: `${origemId}-${alerta.id}`,
        impacto,
        urgencia,
        prioridade: calcularPrioridade(impacto, urgencia),
        origem: origemTipo,
        origemId,
        origemLabel,
        href: hrefBase,
      } satisfies PrioritizedAlerta;
    })
  );
}
