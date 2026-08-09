import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCenarioSimulacao,
  salvarCenarioSimulacao,
  listMarcosCrescimento,
  createMarcoCrescimento,
  updateMarcoCrescimento,
  excluirMarcoCrescimento,
} from '../api/simulacao';
import type { CenarioSimulacaoInput, MarcoCrescimentoInput } from '../types';

const CENARIO_KEY = ['estrategia', 'cenario-simulacao'];
const MARCOS_KEY = ['estrategia', 'marcos-crescimento'];

export function useCenarioSimulacao() {
  return useQuery({ queryKey: CENARIO_KEY, queryFn: getCenarioSimulacao });
}

export function useSalvarCenarioSimulacao(empresaId: string | undefined, usuarioId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CenarioSimulacaoInput) => {
      if (!empresaId) throw new Error('Empresa não identificada — recarregue a página e tente novamente.');
      return salvarCenarioSimulacao(empresaId, usuarioId, payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CENARIO_KEY }),
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
