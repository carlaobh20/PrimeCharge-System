import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMulta,
  deleteMulta,
  listMultasPorEmpresa,
  listMultasPorMotorista,
  listMultasPorVeiculo,
  updateMultaStatus,
  type MultaInput,
} from '../api/multas';
import type { MultaStatus } from '../types';

export function useMultasPorVeiculo(veiculoId: string | undefined) {
  return useQuery({
    queryKey: ['multas', 'veiculo', veiculoId],
    queryFn: () => listMultasPorVeiculo(veiculoId!),
    enabled: !!veiculoId,
  });
}

export function useMultasPorMotorista(motoristaId: string | undefined) {
  return useQuery({
    queryKey: ['multas', 'motorista', motoristaId],
    queryFn: () => listMultasPorMotorista(motoristaId!),
    enabled: !!motoristaId,
  });
}

export function useMultasPorEmpresa() {
  return useQuery({
    queryKey: ['multas', 'empresa'],
    queryFn: listMultasPorEmpresa,
  });
}

function invalidateMultas(queryClient: ReturnType<typeof useQueryClient>, veiculoId: string, motoristaId?: string | null) {
  queryClient.invalidateQueries({ queryKey: ['multas', 'veiculo', veiculoId] });
  queryClient.invalidateQueries({ queryKey: ['multas', 'empresa'] });
  if (motoristaId) queryClient.invalidateQueries({ queryKey: ['multas', 'motorista', motoristaId] });
  queryClient.invalidateQueries({ queryKey: ['timeline'] });
}

export function useCreateMulta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: MultaInput }) => createMulta(empresaId, payload),
    onSuccess: (data) => invalidateMultas(queryClient, data.veiculo_id, data.motorista_id),
  });
}

export function useUpdateMultaStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MultaStatus; veiculoId: string; motoristaId?: string | null }) =>
      updateMultaStatus(id, status),
    onSuccess: (_data, variables) => invalidateMultas(queryClient, variables.veiculoId, variables.motoristaId),
  });
}

export function useDeleteMulta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; veiculoId: string; motoristaId?: string | null }) => deleteMulta(id),
    onSuccess: (_data, variables) => invalidateMultas(queryClient, variables.veiculoId, variables.motoristaId),
  });
}
