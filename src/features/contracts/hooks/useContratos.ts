import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ativarContrato,
  createContrato,
  deleteContrato,
  encerrarContrato,
  getContrato,
  listContratos,
  renovarContrato,
  updateContrato,
  updateContratoStatus,
  type ContratoInput,
} from '../api/contratos';
import type { ContratoStatus } from '../types';

export function useContratos(filters?: { status?: ContratoStatus | 'todos'; busca?: string }) {
  return useQuery({
    queryKey: ['contratos', filters ?? {}],
    queryFn: () => listContratos(filters),
  });
}

export function useContrato(id: string | undefined) {
  return useQuery({
    queryKey: ['contratos', id],
    queryFn: () => getContrato(id!),
    enabled: !!id,
  });
}

function invalidateContrato(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['contratos'] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['contratos', id] });
    queryClient.invalidateQueries({ queryKey: ['timeline', 'contrato', id] });
  }
  // Contrato ativo/encerrado propaga status para Veículo/Motorista no banco (trigger,
  // migration 0005) — invalida as duas listas pra UI refletir sem precisar de refresh manual.
  queryClient.invalidateQueries({ queryKey: ['veiculos'] });
  queryClient.invalidateQueries({ queryKey: ['motoristas'] });
}

export function useCreateContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: ContratoInput }) =>
      createContrato(empresaId, payload),
    onSuccess: () => invalidateContrato(queryClient),
  });
}

export function useUpdateContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ContratoInput> }) => updateContrato(id, payload),
    onSuccess: (_data, variables) => invalidateContrato(queryClient, variables.id),
  });
}

export function useUpdateContratoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContratoStatus }) => updateContratoStatus(id, status),
    onSuccess: (_data, variables) => invalidateContrato(queryClient, variables.id),
  });
}

export function useEncerrarContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kmFinal, cargaFinalPct }: { id: string; kmFinal: number; cargaFinalPct: number }) =>
      encerrarContrato(id, { kmFinal, cargaFinalPct }),
    onSuccess: (_data, variables) => invalidateContrato(queryClient, variables.id),
  });
}

export function useAtivarContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kmInicial, cargaInicialPct }: { id: string; kmInicial: number; cargaInicialPct: number }) =>
      ativarContrato(id, { kmInicial, cargaInicialPct }),
    onSuccess: (_data, variables) => invalidateContrato(queryClient, variables.id),
  });
}

export function useRenovarContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, novaDataFimPrevista }: { id: string; novaDataFimPrevista: string }) =>
      renovarContrato(id, novaDataFimPrevista),
    onSuccess: (_data, variables) => invalidateContrato(queryClient, variables.id),
  });
}

export function useDeleteContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContrato,
    onSuccess: () => invalidateContrato(queryClient),
  });
}
