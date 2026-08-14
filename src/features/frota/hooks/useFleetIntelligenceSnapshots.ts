import { useQuery } from '@tanstack/react-query';
import { useVeiculos } from './useVeiculos';
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { useLancamentosPorEmpresa } from '@/features/financeiro/hooks/useLancamentos';
import { usePagamentosPendentesPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
import {
  coletarInteligenciaDaFrota,
  type VeiculoIntelligenceSnapshot,
} from '@/features/command-center/services/fleetIntelligenceCollector';

export type UseFleetIntelligenceSnapshotsResult =
  | { isLoading: true }
  | { isLoading: false; frota: ReturnType<typeof useVeiculos>['data']; snapshots: VeiculoIntelligenceSnapshot[] };

// Extraído de useFrotaDashboard.ts (Fase A.4) — segundo consumidor do mesmo snapshot de
// inteligência da frota inteira (Comparativo dedicado, Fase A.4) apareceu, então a busca em si
// virou hook próprio em vez de duplicada — "regra dos 3" (DEC-008), mesmo racional de
// moedaInput.ts. Continua reaproveitando coletarInteligenciaDaFrota de command-center/ (ver
// nota de acoplamento cruzado em useFrotaDashboard.ts).
export function useFleetIntelligenceSnapshots(): UseFleetIntelligenceSnapshotsResult {
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

  return { isLoading: false, frota, snapshots: qSnapshots.data };
}
