import { useLancamentosPorEmpresa } from '@/features/financeiro/hooks/useLancamentos';
import { useFleetIntelligenceSnapshots } from './useFleetIntelligenceSnapshots';
import { calcularItensComparativo, type ComparativoFrotaItem } from '../intelligence/comparativoFrota';

export type UseComparativoFrotaResult = { isLoading: true } | { isLoading: false; itens: ComparativoFrotaItem[] };

// useLancamentosPorEmpresa() já é chamado por useFleetIntelligenceSnapshots por baixo — mesma
// queryKey, React Query dedupe automaticamente (sem consulta duplicada de verdade).
export function useComparativoFrota(): UseComparativoFrotaResult {
  const snap = useFleetIntelligenceSnapshots();
  const qLancamentos = useLancamentosPorEmpresa();

  if (snap.isLoading || qLancamentos.isLoading || !qLancamentos.data) {
    return { isLoading: true };
  }

  const itens = calcularItensComparativo(snap.frota ?? [], snap.snapshots, qLancamentos.data);
  return { isLoading: false, itens };
}
