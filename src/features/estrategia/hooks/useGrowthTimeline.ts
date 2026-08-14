import { useMemo } from 'react';
import { useCapitalAllocation } from './useCapitalAllocation';
import { usePoliticasEstrategicas } from './usePoliticas';
import { calcularTimelineDeCrescimento, type TimelineDeCrescimento } from '../intelligence/growthTimeline';

// Reaproveita useCapitalAllocation() (mesmas queries, mesmo dedupe do React Query) em vez de
// buscar veículos/lançamentos/pagamentos de novo — a Timeline é só mais uma leitura sobre o
// mesmo ResumoCapitalAlocado, mesma regra DEC-024 de sempre (agregador consome o cálculo já
// existente, não recalcula). Políticas entra só pelo campo financiamento_maximo_pct, se definido.
export function useGrowthTimeline():
  | { isLoading: true; isError: false }
  | { isLoading: false; isError: true; error: unknown }
  | { isLoading: false; isError: false; timeline: TimelineDeCrescimento } {
  const capital = useCapitalAllocation();
  const qPoliticas = usePoliticasEstrategicas();

  const isLoading = capital.isLoading || qPoliticas.isLoading;

  return useMemo(() => {
    if (isLoading) return { isLoading: true, isError: false };
    if (capital.isError) return { isLoading: false, isError: true, error: capital.error };
    if (qPoliticas.isError) return { isLoading: false, isError: true, error: qPoliticas.error };
    if (capital.isLoading) return { isLoading: true, isError: false };

    return {
      isLoading: false,
      isError: false,
      timeline: calcularTimelineDeCrescimento(capital.resumo, qPoliticas.data ?? null),
    };
  }, [isLoading, capital, qPoliticas.data, qPoliticas.error, qPoliticas.isError]);
}
