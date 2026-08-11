import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLancamento,
  deleteLancamento,
  gerarCobrancasRecorrentes,
  getLancamento,
  listLancamentos,
  listLancamentosPorEmpresa,
  updateLancamento,
  updateLancamentoStatus,
  type LancamentoFilters,
  type LancamentoInput,
} from '../api/lancamentos';
import type { LancamentoStatus } from '../types';

export function useLancamentos(filters?: LancamentoFilters) {
  return useQuery({
    queryKey: ['lancamentos', filters ?? {}],
    queryFn: () => listLancamentos(filters),
  });
}

export function useLancamento(id: string | undefined) {
  return useQuery({
    queryKey: ['lancamentos', id],
    queryFn: () => getLancamento(id!),
    enabled: !!id,
  });
}

// Sem filtro/paginação — mesmo padrão de listContratosPorEmpresa, consumida por
// Vehicle/Driver/Contract Intelligence para calcular a categoria financeira (DEC-048).
export function useLancamentosPorEmpresa() {
  return useQuery({
    queryKey: ['lancamentos', 'todos'],
    queryFn: listLancamentosPorEmpresa,
  });
}

function invalidateLancamento(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['lancamentos', id] });
    queryClient.invalidateQueries({ queryKey: ['timeline'] });
  }
  // Lançamento com dimensão de Veículo/Motorista/Contrato afeta a categoria financeira de
  // Health Score dos três (DEC-047) — invalida para refletir sem refresh manual.
  queryClient.invalidateQueries({ queryKey: ['veiculos'] });
  queryClient.invalidateQueries({ queryKey: ['motoristas'] });
  queryClient.invalidateQueries({ queryKey: ['contratos'] });
}

export function useCreateLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: LancamentoInput }) =>
      createLancamento(empresaId, payload),
    onSuccess: () => invalidateLancamento(queryClient),
  });
}

export function useUpdateLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LancamentoInput> }) => updateLancamento(id, payload),
    onSuccess: (_data, variables) => invalidateLancamento(queryClient, variables.id),
  });
}

export function useUpdateLancamentoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LancamentoStatus }) => updateLancamentoStatus(id, status),
    onSuccess: (_data, variables) => invalidateLancamento(queryClient, variables.id),
  });
}

export function useDeleteLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLancamento,
    onSuccess: () => invalidateLancamento(queryClient),
  });
}

// Botão "Gerar cobranças do mês" (migration 0029, fn_gerar_cobrancas_recorrentes) — sempre a
// competência atual (null → banco usa date_trunc('month', current_date)), sem seletor de mês
// nesta fase. Mesma invalidação de useCreateLancamento: cria lançamentos novos.
export function useGerarCobrancasRecorrentes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (empresaId: string) => gerarCobrancasRecorrentes(empresaId, null),
    onSuccess: () => invalidateLancamento(queryClient),
  });
}
