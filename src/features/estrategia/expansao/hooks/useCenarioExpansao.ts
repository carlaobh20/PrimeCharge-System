import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listCenariosExpansao,
  criarCenarioExpansao,
  atualizarCenarioExpansao,
  excluirCenarioExpansao,
} from '../api/cenarioExpansao';
import type { CenarioExpansaoInput } from '../types';

const CENARIOS_EXPANSAO_KEY = ['estrategia', 'cenarios-expansao'];

export function useCenariosExpansao() {
  return useQuery({ queryKey: CENARIOS_EXPANSAO_KEY, queryFn: listCenariosExpansao });
}

export function useCriarCenarioExpansao(empresaId: string | undefined, usuarioId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CenarioExpansaoInput) => {
      if (!empresaId) throw new Error('Empresa não identificada — recarregue a página e tente novamente.');
      return criarCenarioExpansao(empresaId, usuarioId, payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CENARIOS_EXPANSAO_KEY }),
  });
}

export function useAtualizarCenarioExpansao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CenarioExpansaoInput> }) => atualizarCenarioExpansao(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CENARIOS_EXPANSAO_KEY }),
  });
}

export function useExcluirCenarioExpansao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirCenarioExpansao(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CENARIOS_EXPANSAO_KEY }),
  });
}
