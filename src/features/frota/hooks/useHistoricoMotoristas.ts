import { useContratos } from '@/features/contracts/hooks/useContratos';
import { useLancamentos } from '@/features/financeiro/hooks/useLancamentos';
import { useMultasPorVeiculo } from '@/features/operacoes/hooks/useMultas';
import { calcularHistoricoMotoristas, type MotoristaHistoricoItem } from '../intelligence/historicoMotoristas';

export type UseHistoricoMotoristasResult = { isLoading: true } | { isLoading: false; itens: MotoristaHistoricoItem[] };

export function useHistoricoMotoristas(veiculoId: string | undefined): UseHistoricoMotoristasResult {
  const { data: contratos, isLoading: loadingContratos } = useContratos({ veiculoId });
  const { data: lancamentos, isLoading: loadingLancamentos } = useLancamentos({ veiculoId });
  const { data: multas, isLoading: loadingMultas } = useMultasPorVeiculo(veiculoId);

  const isLoading = !veiculoId || loadingContratos || loadingLancamentos || loadingMultas;
  if (isLoading) return { isLoading: true };

  const itens = calcularHistoricoMotoristas(contratos ?? [], lancamentos ?? [], multas ?? [], new Date());
  return { isLoading: false, itens };
}
