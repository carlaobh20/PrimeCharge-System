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
import type { Motorista, MotoristaStatus } from '../types';

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

// Épico 6 — CRM, Fase 1. Update otimista: o Kanban precisa que o card mova na hora do drop,
// não só depois da rodada de rede — sem isso, o dnd-kit anima o card indo pra coluna nova e aí
// ele "pisca" de volta até a resposta do servidor chegar. `etapa_funil_desde` também é
// atualizado otimisticamente (aproximação de `new Date()` — o valor real vem do trigger no
// próximo refetch, mas a UI não pode ficar com "dias na etapa" desatualizado até lá).
export function useMoverEtapaFunil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, etapaFunilId }: { id: string; etapaFunilId: string }) =>
      updateMotorista(id, { etapa_funil_id: etapaFunilId }),
    onMutate: async ({ id, etapaFunilId }) => {
      await queryClient.cancelQueries({ queryKey: ['motoristas'] });
      const agoraIso = new Date().toISOString();
      const previas = queryClient.getQueriesData<Motorista[]>({ queryKey: ['motoristas'] });
      for (const [queryKey, data] of previas) {
        if (!data) continue;
        queryClient.setQueryData<Motorista[]>(
          queryKey,
          data.map((m) => (m.id === id ? { ...m, etapa_funil_id: etapaFunilId, etapa_funil_desde: agoraIso } : m))
        );
      }
      return { previas };
    },
    onError: (_err, _vars, context) => {
      context?.previas.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['motoristas'] });
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
