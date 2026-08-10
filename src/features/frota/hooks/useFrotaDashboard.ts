import { useQuery } from '@tanstack/react-query';
import { useVeiculos } from './useVeiculos';
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { useLancamentosPorEmpresa } from '@/features/financeiro/hooks/useLancamentos';
import { usePagamentosPendentesPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
import { coletarInteligenciaDaFrota } from '@/features/command-center/services/fleetIntelligenceCollector';
import { calcularResumoDaFrota, type FleetHealthSummary } from '@/features/command-center/engine/fleetHealthEngine';
import { resolverValorAtualVeiculo } from '@/shared/lib/valorAtivo';
import { VEICULO_STATUS_LABEL, type VeiculoStatus } from '../types';

// Épico 4 — "Frota" (menu). Dashboard da Frota reaproveita, de propósito, o MESMO motor de
// health score que o Centro de Operações usa pro "Resumo da Frota" (calcularResumoDaFrota +
// coletarInteligenciaDaFrota, ambos em features/command-center) em vez de recalcular health
// score de outro jeito aqui — a alternativa seria duplicar a lógica de saúde do veículo.
//
// Nota de arquitetura (Palpite, flagar no relatório final): isso cria acoplamento cruzado —
// command-center já importa de frota/intelligence e frota/types; agora frota importa de volta
// de command-center/services e command-center/engine. Não é ciclo de import de arquivo (os
// arquivos específicos não se importam de volta um ao outro), mas é acoplamento bidirecional
// de FEATURE. Recomendação pro relatório final: promover fleetHealthEngine.ts +
// coletarInteligenciaDaFrota (a parte de health score, não a de alertas/insights) para
// shared/intelligence/ — regra dos 3 (DEC-008) já foi atingida: 2 features (command-center e
// agora frota) precisam do mesmo cálculo.
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
  const qFrota = useVeiculos();
  const qContratos = useContratos();
  const qLancamentos = useLancamentosPorEmpresa();
  const qPagamentos = usePagamentosPendentesPorEmpresa();

  const frota = qFrota.data;
  const contratos = qContratos.data;
  const lancamentos = qLancamentos.data;
  const pagamentosPendentes = qPagamentos.data;

  const baseQueries = [qFrota, qContratos, qLancamentos, qPagamentos];
  const loadingBase = baseQueries.some((q) => q.isLoading);
  const semErroBase = !baseQueries.some((q) => q.isError);

  const crossFeatureDeps = {
    contratos: contratos ?? [],
    lancamentos: lancamentos ?? [],
    pagamentosPendentes: pagamentosPendentes ?? [],
    veiculos: frota ?? [],
  };

  // Mesma queryKey-shape do Command Center (fleet-intelligence) mudaria a chave de cache se
  // divergisse — mantém um namespace próprio ('frota-dashboard') porque os deps aqui são um
  // subconjunto (sem motoristas), então não faz sentido fingir ser a mesma query.
  const qSnapshots = useQuery({
    queryKey: [
      'frota-dashboard',
      'fleet-intelligence',
      (frota ?? []).map((v) => v.id).join(','),
      crossFeatureDeps.contratos.length,
      crossFeatureDeps.lancamentos.length,
      crossFeatureDeps.pagamentosPendentes.length,
    ],
    queryFn: () => coletarInteligenciaDaFrota(frota ?? [], crossFeatureDeps),
    enabled: !loadingBase && semErroBase,
  });

  if (loadingBase || qSnapshots.isLoading || !qSnapshots.data) {
    return { isLoading: true };
  }

  const snapshots = qSnapshots.data;
  const resumoHealth = calcularResumoDaFrota(snapshots);

  const porStatus = (Object.keys(VEICULO_STATUS_LABEL) as VeiculoStatus[]).map((status) => ({
    status,
    label: VEICULO_STATUS_LABEL[status],
    total: (frota ?? []).filter((v) => v.status === status).length,
  }));

  const valores = (frota ?? [])
    .map((v) => resolverValorAtualVeiculo(v))
    .filter((v): v is number => v !== null);
  const valorTotalFrota = valores.length > 0 ? valores.reduce((soma, v) => soma + v, 0) : null;

  const totalVeiculos = (frota ?? []).length;
  const disponiveis = (frota ?? []).filter((v) => STATUS_DISPONIVEL.includes(v.status)).length;
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
