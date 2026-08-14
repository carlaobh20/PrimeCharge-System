import { useFleetIntelligenceSnapshots } from './useFleetIntelligenceSnapshots';
import { calcularResumoDaFrota, type FleetHealthSummary } from '@/features/command-center/engine/fleetHealthEngine';
import { resolverValorAtualVeiculo } from '@/shared/lib/valorAtivo';
import { VEICULO_STATUS_LABEL, type VeiculoStatus } from '../types';

// Épico 4 — "Frota" (menu). Dashboard da Frota reaproveita, de propósito, o MESMO motor de
// health score que o Centro de Operações usa pro "Resumo da Frota" (calcularResumoDaFrota,
// sobre o snapshot de useFleetIntelligenceSnapshots) em vez de recalcular health score de
// outro jeito aqui — a alternativa seria duplicar a lógica de saúde do veículo.
//
// Nota de arquitetura (Palpite, flagar no relatório final): useFleetIntelligenceSnapshots
// reaproveita coletarInteligenciaDaFrota de features/command-center/ — cria acoplamento
// cruzado (command-center já importa de frota/intelligence e frota/types; agora frota importa
// de volta de command-center/services e command-center/engine). Não é ciclo de import de
// arquivo, mas é acoplamento bidirecional de FEATURE. Recomendação pro relatório final:
// promover fleetHealthEngine.ts + a parte de health score de coletarInteligenciaDaFrota para
// shared/intelligence/ — regra dos 3 (DEC-008) já foi atingida: command-center, frota/dashboard
// e agora frota/comparativo (Fase A.4) precisam do mesmo cálculo.
export type FrotaDashboardResult =
  | { isLoading: true }
  | {
      isLoading: false;
      totalVeiculos: number;
      porStatus: Array<{ status: VeiculoStatus; label: string; total: number }>;
      resumoHealth: FleetHealthSummary;
      valorTotalFrota: number | null;
      veiculosComValor: number;
      disponibilidadePct: number | null;
    };

const STATUS_DISPONIVEL: VeiculoStatus[] = ['disponivel', 'alugado'];

export function useFrotaDashboard(): FrotaDashboardResult {
  const snap = useFleetIntelligenceSnapshots();
  if (snap.isLoading) return { isLoading: true };

  const frota = snap.frota ?? [];
  const resumoHealth = calcularResumoDaFrota(snap.snapshots);

  const porStatus = (Object.keys(VEICULO_STATUS_LABEL) as VeiculoStatus[]).map((status) => ({
    status,
    label: VEICULO_STATUS_LABEL[status],
    total: frota.filter((v) => v.status === status).length,
  }));

  const valores = frota.map((v) => resolverValorAtualVeiculo(v)).filter((v): v is number => v !== null);
  const valorTotalFrota = valores.length > 0 ? valores.reduce((soma, v) => soma + v, 0) : null;

  const totalVeiculos = frota.length;
  const disponiveis = frota.filter((v) => STATUS_DISPONIVEL.includes(v.status)).length;
  const disponibilidadePct = totalVeiculos > 0 ? Math.round((disponiveis / totalVeiculos) * 100) : null;

  return {
    isLoading: false,
    totalVeiculos,
    porStatus,
    resumoHealth,
    valorTotalFrota,
    veiculosComValor: valores.length,
    disponibilidadePct,
  };
}
