import type { VeiculoComRelacoes } from '@/features/frota/types';
import type { HealthScoreResult } from '@/shared/intelligence/types';
import type { VeiculoIntelligenceSnapshot } from '../services/fleetIntelligenceCollector';

export type VeiculoComHealth = { veiculo: VeiculoComRelacoes; healthScore: HealthScoreResult };

export type FleetHealthSummary = {
  totalVeiculos: number;
  veiculosAvaliados: number;
  /** Média do overall dos veículos com score real — null se nenhum veículo tem score ainda. */
  healthMedio: number | null;
  /** Overall < 50 — limiar inicial, ajustável conforme o produto amadurece (ver DEC-024). */
  veiculosCriticos: VeiculoComHealth[];
  /** Overall >= 85 — mesmo limiar inicial. */
  veiculosDestaque: VeiculoComHealth[];
};

const LIMIAR_CRITICO = 50;
const LIMIAR_DESTAQUE = 85;
const MAX_POR_LISTA = 5;

// Cobre, no mesmo cálculo, os blocos "Resumo da Frota", "Health Médio da Empresa",
// "Veículos Críticos" e "Veículos Destaque" — são a mesma informação (o healthScore de
// cada veículo) vista em granularidades diferentes, então uma função só, consumida pelas
// telas em pedaços diferentes.
export function calcularResumoDaFrota(frota: VeiculoIntelligenceSnapshot[]): FleetHealthSummary {
  const comScore = frota.filter((v) => v.healthScore.overall !== null);
  const healthMedio =
    comScore.length === 0
      ? null
      : Math.round(comScore.reduce((soma, v) => soma + (v.healthScore.overall as number), 0) / comScore.length);

  const veiculosCriticos = comScore
    .filter((v) => (v.healthScore.overall as number) < LIMIAR_CRITICO)
    .sort((a, b) => (a.healthScore.overall as number) - (b.healthScore.overall as number))
    .slice(0, MAX_POR_LISTA)
    .map(({ veiculo, healthScore }) => ({ veiculo, healthScore }));

  const veiculosDestaque = comScore
    .filter((v) => (v.healthScore.overall as number) >= LIMIAR_DESTAQUE)
    .sort((a, b) => (b.healthScore.overall as number) - (a.healthScore.overall as number))
    .slice(0, MAX_POR_LISTA)
    .map(({ veiculo, healthScore }) => ({ veiculo, healthScore }));

  return {
    totalVeiculos: frota.length,
    veiculosAvaliados: comScore.length,
    healthMedio,
    veiculosCriticos,
    veiculosDestaque,
  };
}
