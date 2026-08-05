import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMotorista,
  deleteMotorista,
  getMotorista,
  listMotoristas,
  updateMotorista,
  updateMotoristaStatus,
  type MotoristaInput,
} from '../api/motoristas';
import type { MotoristaStatus } from '../types';

export function useMotoristas(filters?: { status?: MotoristaStatus | 'todos'; busca?: string }) {
  return useQuery({
    queryKey: ['motoristas', filters ?? {}],
    queryFn: () => listMotoristas(filters),
  });
}

export function useMotorista(id: string | undefined) {
  return useQuery({
    queryKey: ['motoristas', id],
    queryFn: () => getMotorista(id!),
    enabled: !!id,
  });
}

export function useCreateMotorista() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: MotoristaInput }) =>
      createMotorista(empresaId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motoristas'] });
    },
  });
}

export function useUpdateMotorista() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MotoristaInput> }) => updateMotorista(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['motoristas'] });
      queryClient.invalidateQueries({ queryKey: ['motoristas', variables.id] });
    },
  });
}

export function useUpdateMotoristaStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MotoristaStatus }) => updateMotoristaStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['motoristas'] });
      queryClient.invalidateQueries({ queryKey: ['motoristas', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['timeline', 'motorista', variables.id] });
    },
  });
}

export function useDeleteMotorista() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMotorista,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motoristas'] });
    },
  });
}
