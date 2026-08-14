import { useMemo } from 'react';
import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { useLancamentosPorEmpresa } from '@/features/financeiro/hooks/useLancamentos';
import { usePagamentosPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
import { calcularCapitalAlocado, type ResumoCapitalAlocado } from '../intelligence/capitalAllocation';

// Reaproveita os mesmos hooks de listagem que useEmpresaHealth/useCommandCenter já usam —
// React Query dedupe (mesma queryKey) garante que abrir o Centro de Estratégia depois do
// Dashboard/Centro de Operações não dispara nenhuma consulta nova (mesmo raciocínio já
// documentado em useEmpresaHealth.ts).
//
// isLoading/isError usam o estado real das consultas (não `!data`) desde o início — mesmo
// achado de campo corrigido hoje em useFilasDeTrabalho.ts/useCommandCenter.ts, aplicado aqui
// já na primeira versão em vez de repetir o bug uma quarta vez.
export function useCapitalAllocation():
  | { isLoading: true; isError: false }
  | { isLoading: false; isError: true; error: unknown }
  | { isLoading: false; isError: false; resumo: ResumoCapitalAlocado } {
  const qVeiculos = useVeiculos();
  const qLancamentos = useLancamentosPorEmpresa();
  const qPagamentos = usePagamentosPorEmpresa();

  const queries = [qVeiculos, qLancamentos, qPagamentos];
  const isLoading = queries.some((q) => q.isLoading);
  const queryComErro = queries.find((q) => q.isError);

  const veiculos = qVeiculos.data;
  const lancamentos = qLancamentos.data;
  const pagamentos = qPagamentos.data;

  return useMemo(() => {
    if (isLoading) return { isLoading: true, isError: false };
    if (queryComErro || !veiculos || !lancamentos || !pagamentos) {
      return { isLoading: false, isError: true, error: queryComErro?.error };
    }
    return { isLoading: false, isError: false, resumo: calcularCapitalAlocado(veiculos, lancamentos, pagamentos) };
  }, [isLoading, queryComErro, veiculos, lancamentos, pagamentos]);
}
