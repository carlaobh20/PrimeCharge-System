import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPagamento,
  listPagamentos,
  listPagamentosPendentesPorEmpresa,
  updatePagamentoStatus,
  type PagamentoInput,
} from '../api/pagamentos';
import type { PagamentoStatus } from '../types';

export function usePagamentos(filters?: { status?: PagamentoStatus | 'todos'; lancamentoId?: string }) {
  return useQuery({
    queryKey: ['pagamentos', filters ?? {}],
    queryFn: () => listPagamentos(filters),
  });
}

// Consumida pela Financial Intelligence para inadimplência/atraso (DEC-047/DEC-048).
export function usePagamentosPendentesPorEmpresa() {
  return useQuery({
    queryKey: ['pagamentos', 'pendentes'],
    queryFn: listPagamentosPendentesPorEmpresa,
  });
}

function invalidatePagamento(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
  // "pago" propaga para o lançamento vinculado (fn_propagar_status_pagamento) — invalida
  // lancamentos e as três entidades cuja categoria financeira depende desse dado.
  queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
  queryClient.invalidateQueries({ queryKey: ['veiculos'] });
  queryClient.invalidateQueries({ queryKey: ['motoristas'] });
  queryClient.invalidateQueries({ queryKey: ['contratos'] });
}

export function useCreatePagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: PagamentoInput }) =>
      createPagamento(empresaId, payload),
    onSuccess: () => invalidatePagamento(queryClient),
  });
}

export function useUpdatePagamentoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PagamentoStatus }) => updatePagamentoStatus(id, status),
    onSuccess: () => invalidatePagamento(queryClient),
  });
}
