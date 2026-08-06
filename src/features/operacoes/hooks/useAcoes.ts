import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAcao,
  getAcao,
  listAcoes,
  listAcoesPorEmpresa,
  sincronizarAcoesGeradas,
  updateAcao,
  updateAcaoStatus,
  type AcaoFilters,
  type AcaoInput,
} from '../api/acoes';
import { montarCandidatas } from '../intelligence/sincronizarAcoes';
import type { AcaoStatus } from '../types';

export function useAcoes(filters?: AcaoFilters) {
  return useQuery({
    queryKey: ['acoes_operacionais', filters ?? {}],
    queryFn: () => listAcoes(filters),
  });
}

export function useAcao(id: string | undefined) {
  return useQuery({
    queryKey: ['acoes_operacionais', id],
    queryFn: () => getAcao(id!),
    enabled: !!id,
  });
}

// Sem filtro — consumida pelo Command Center para o resumo de Ações Operacionais (DEC-055).
export function useAcoesPorEmpresa() {
  return useQuery({
    queryKey: ['acoes_operacionais', 'todas'],
    queryFn: listAcoesPorEmpresa,
  });
}

function invalidateAcoes(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['acoes_operacionais'] });
  queryClient.invalidateQueries({ queryKey: ['timeline'] });
}

export function useCreateAcao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: AcaoInput }) => createAcao(empresaId, payload),
    onSuccess: () => invalidateAcoes(queryClient),
  });
}

export function useUpdateAcao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AcaoInput> }) => updateAcao(id, payload),
    onSuccess: () => invalidateAcoes(queryClient),
  });
}

export function useUpdateAcaoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AcaoStatus }) => updateAcaoStatus(id, status),
    onSuccess: () => invalidateAcoes(queryClient),
  });
}

// Botão "Atualizar ações" — roda os geradores (intelligence/geradores/) sobre o dado já
// carregado no client e sincroniza contra o banco (DEC-055). Sem pg_cron: só acontece quando
// alguém clica.
export function useSincronizarAcoes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      empresaId,
      ...candidatasInput
    }: Parameters<typeof montarCandidatas>[0] & { empresaId: string }) =>
      sincronizarAcoesGeradas(empresaId, montarCandidatas(candidatasInput)),
    onSuccess: () => invalidateAcoes(queryClient),
  });
}
