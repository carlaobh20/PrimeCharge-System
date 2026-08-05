import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createVeiculo,
  deleteVeiculo,
  getVeiculo,
  listVeiculos,
  updateVeiculo,
  updateVeiculoStatus,
  type VeiculoInput,
} from '../api/veiculos';
import type { VeiculoStatus } from '../types';

export function useVeiculos(filters?: { status?: VeiculoStatus | 'todos'; busca?: string }) {
  return useQuery({
    queryKey: ['veiculos', filters ?? {}],
    queryFn: () => listVeiculos(filters),
  });
}

export function useVeiculo(id: string | undefined) {
  return useQuery({
    queryKey: ['veiculos', id],
    queryFn: () => getVeiculo(id!),
    enabled: !!id,
  });
}

export function useCreateVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: VeiculoInput }) =>
      createVeiculo(empresaId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
    },
  });
}

export function useUpdateVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<VeiculoInput> }) => updateVeiculo(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['veiculos', variables.id] });
    },
  });
}

export function useUpdateVeiculoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: VeiculoStatus }) => updateVeiculoStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['veiculos', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['timeline', 'veiculo', variables.id] });
    },
  });
}

export function useDeleteVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVeiculo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
    },
  });
}
