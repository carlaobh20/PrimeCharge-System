import { useMemo } from 'react';
import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { useContasBancarias } from '@/features/financeiro/hooks/useContasBancarias';
import { usePagamentosPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
import { calcularEstadoRealFrota, type EstadoRealFrota } from '../intelligence/estadoReal';
import type { Veiculo } from '@/features/frota/types';

// Épico 9 — Motor de Expansão, Fase 1. Mesmos hooks de listagem que useCapitalAllocation já usa
// (React Query dedupe por queryKey — abrir a aba Expansão depois do Centro de Estratégia não
// dispara nenhuma consulta nova). isLoading/isError usam o estado real das queries, não `!data`.
export function useEstadoRealFrota():
  | { isLoading: true; isError: false }
  | { isLoading: false; isError: true; error: unknown }
  | { isLoading: false; isError: false; estadoReal: EstadoRealFrota; veiculos: Veiculo[] } {
  const qVeiculos = useVeiculos();
  const qContas = useContasBancarias();
  const qPagamentos = usePagamentosPorEmpresa();

  const queries = [qVeiculos, qContas, qPagamentos];
  const isLoading = queries.some((q) => q.isLoading);
  const queryComErro = queries.find((q) => q.isError);

  const veiculos = qVeiculos.data;
  const contas = qContas.data;
  const pagamentos = qPagamentos.data;

  return useMemo(() => {
    if (isLoading) return { isLoading: true, isError: false };
    if (queryComErro || !veiculos || !contas || !pagamentos) {
      return { isLoading: false, isError: true, error: queryComErro?.error };
    }
    // calcularSaldoPorConta só quer pagamentos com status 'pago' (dinheiro que de fato entrou/
    // saiu da conta) — pendente/cancelado/estornado não afetam o saldo real (mesma regra já
    // aplicada em resumoFinanceiro.ts).
    const pagamentosPagos = pagamentos
      .filter((p) => p.status === 'pago' && p.lancamento)
      .map((p) => ({ conta_bancaria_id: p.conta_bancaria_id, valor: p.valor, tipo: p.lancamento!.tipo }));

    return {
      isLoading: false,
      isError: false,
      estadoReal: calcularEstadoRealFrota(veiculos, contas, pagamentosPagos),
      veiculos,
    };
  }, [isLoading, queryComErro, veiculos, contas, pagamentos]);
}
