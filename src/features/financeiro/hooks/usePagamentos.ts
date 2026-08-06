import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPagamento,
  listPagamentos,
  listPagamentosPendentesPorEmpresa,
  listPagamentosPorEmpresa,
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

type FiltroEntidade = { veiculoId?: string; motoristaId?: string; contratoId?: string };

// Consumida pela Financial Intelligence para inadimplência/atraso (DEC-047/DEC-048). `filtro`
// opcional (Missão 5, Fase 1) — veiculo/motorista/contrato Cockpit passam a filtrar
// server-side em vez de buscar a empresa inteira e filtrar em memória; Command Center continua
// chamando sem filtro.
export function usePagamentosPendentesPorEmpresa(filtro?: FiltroEntidade) {
  return useQuery({
    queryKey: ['pagamentos', 'pendentes', filtro ?? {}],
    queryFn: () => listPagamentosPendentesPorEmpresa(filtro),
  });
}

// Consumida pelo Driver Score (Missão 3) para calcular pontualidade real de pagamento.
// `filtro` opcional, mesmo motivo de usePagamentosPendentesPorEmpresa acima.
export function usePagamentosPorEmpresa(filtro?: FiltroEntidade) {
  return useQuery({
    queryKey: ['pagamentos', 'todos', filtro ?? {}],
    queryFn: () => listPagamentosPorEmpresa(filtro),
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
