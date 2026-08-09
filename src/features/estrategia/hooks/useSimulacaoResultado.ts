import { useMemo } from 'react';
import { useCenarioSimulacao, useMarcosCrescimento } from './useSimulacao';
import { simularCrescimentoEmpresarial, type SimulacaoResultado } from '../intelligence/simulacaoEmpresarial';
import type { CenarioSimulacao } from '../types';

// Roda o motor puro (simulacaoEmpresarial.ts) em cima do cenário + marcos já buscados — recalcula
// sempre que qualquer um dos dois muda (React Query invalida a query, useMemo recalcula).
export function useSimulacaoResultado():
  | { isLoading: true; isError: false }
  | { isLoading: false; isError: true; error: unknown }
  | { isLoading: false; isError: false; cenario: null; resultado: null }
  | { isLoading: false; isError: false; cenario: CenarioSimulacao; resultado: SimulacaoResultado } {
  const qCenario = useCenarioSimulacao();
  const qMarcos = useMarcosCrescimento();

  const isLoading = qCenario.isLoading || qMarcos.isLoading;

  return useMemo(() => {
    if (isLoading) return { isLoading: true, isError: false };
    if (qCenario.isError) return { isLoading: false, isError: true, error: qCenario.error };
    if (qMarcos.isError) return { isLoading: false, isError: true, error: qMarcos.error };
    if (qCenario.isLoading || qMarcos.isLoading) return { isLoading: true, isError: false };

    if (!qCenario.data) {
      return { isLoading: false, isError: false, cenario: null, resultado: null };
    }

    return {
      isLoading: false,
      isError: false,
      cenario: qCenario.data,
      resultado: simularCrescimentoEmpresarial(qCenario.data, qMarcos.data ?? []),
    };
  }, [isLoading, qCenario, qMarcos]);
}
