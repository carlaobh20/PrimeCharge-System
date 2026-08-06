import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  atualizarProgressoMeta,
  createMeta,
  deleteMeta,
  listMetasPorEmpresa,
  updateMetaStatus,
  type MetaInput,
} from '../api/metas';
import type { MetaStatus } from '../types';

export function useMetasPorEmpresa() {
  return useQuery({
    queryKey: ['metas'],
    queryFn: listMetasPorEmpresa,
  });
}

function invalidateMetas(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['metas'] });
}

export function useCreateMeta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, criadoPor, payload }: { empresaId: string; criadoPor?: string; payload: MetaInput }) =>
      createMeta(empresaId, criadoPor, payload),
    onSuccess: () => invalidateMetas(queryClient),
  });
}

export function useAtualizarProgressoMeta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, valorAtual }: { id: string; valorAtual: number }) => atualizarProgressoMeta(id, valorAtual),
    onSuccess: () => invalidateMetas(queryClient),
  });
}

export function useUpdateMetaStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MetaStatus }) => updateMetaStatus(id, status),
    onSuccess: () => invalidateMetas(queryClient),
  });
}

export function useDeleteMeta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMeta(id),
    onSuccess: () => invalidateMetas(queryClient),
  });
}
