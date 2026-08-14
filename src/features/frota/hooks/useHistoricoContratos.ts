import { useContratos } from '@/features/contracts/hooks/useContratos';
import { useLancamentos } from '@/features/financeiro/hooks/useLancamentos';
import { useMultasPorVeiculo } from '@/features/operacoes/hooks/useMultas';
import { calcularHistoricoContratos, type ContratoHistoricoItem } from '../intelligence/historicoContratos';

export type UseHistoricoContratosResult = { isLoading: true } | { isLoading: false; itens: ContratoHistoricoItem[] };

// Ponte dado→cálculo pra aba Contratos do Cockpit — reaproveita os MESMOS hooks (mesma
// queryKey) já usados por FinanceiroTab (useLancamentos({veiculoId})) e por useSaudeDoAtivo
// (useMultasPorVeiculo), então React Query dedupe entre abas abertas na mesma sessão.
export function useHistoricoContratos(veiculoId: string | undefined): UseHistoricoContratosResult {
  const { data: contratos, isLoading: loadingContratos } = useContratos({ veiculoId });
  const { data: lancamentos, isLoading: loadingLancamentos } = useLancamentos({ veiculoId });
  const { data: multas, isLoading: loadingMultas } = useMultasPorVeiculo(veiculoId);

  const isLoading = !veiculoId || loadingContratos || loadingLancamentos || loadingMultas;
  if (isLoading) return { isLoading: true };

  const itens = calcularHistoricoContratos(contratos ?? [], lancamentos ?? [], multas ?? []);
  return { isLoading: false, itens };
}
