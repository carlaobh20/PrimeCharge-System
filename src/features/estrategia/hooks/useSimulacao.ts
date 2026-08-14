import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listCenarios,
  criarCenario,
  atualizarCenario,
  excluirCenario,
  listMarcosCrescimento,
  createMarcoCrescimento,
  updateMarcoCrescimento,
  excluirMarcoCrescimento,
} from '../api/simulacao';
import type { CenarioSimulacaoInput, MarcoCrescimentoInput } from '../types';

const CENARIOS_KEY = ['estrategia', 'cenarios-simulacao'];
const MARCOS_KEY = ['estrategia', 'marcos-crescimento'];

// N cenários por empresa desde a v2 (Central de Decisão) — ver migration 0017.
export function useCenarios() {
  return useQuery({ queryKey: CENARIOS_KEY, queryFn: listCenarios });
}

export function useCriarCenario(empresaId: string | undefined, usuarioId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CenarioSimulacaoInput) => {
      if (!empresaId) throw new Error('Empresa não identificada — recarregue a página e tente novamente.');
      return criarCenario(empresaId, usuarioId, payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CENARIOS_KEY }),
  });
}

export function useAtualizarCenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CenarioSimulacaoInput> }) => atualizarCenario(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CENARIOS_KEY }),
  });
}

export function useExcluirCenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirCenario(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CENARIOS_KEY }),
  });
}

export function useMarcosCrescimento() {
  return useQuery({ queryKey: MARCOS_KEY, queryFn: listMarcosCrescimento });
}

export function useCreateMarcoCrescimento(empresaId: string | undefined, usuarioId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MarcoCrescimentoInput) => {
      if (!empresaId) throw new Error('Empresa não identificada — recarregue a página e tente novamente.');
      return createMarcoCrescimento(empresaId, usuarioId, payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MARCOS_KEY }),
  });
}

export function useUpdateMarcoCrescimento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MarcoCrescimentoInput> & { concluido_manualmente?: boolean } }) =>
      updateMarcoCrescimento(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MARCOS_KEY }),
  });
}

export function useExcluirMarcoCrescimento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirMarcoCrescimento(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MARCOS_KEY }),
  });
}
