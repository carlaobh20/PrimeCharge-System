import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPoliticasDaEmpresa, salvarPoliticas } from '../api/politicas';
import type { PoliticasEmpresaInput } from '../types';

const QUERY_KEY = ['estrategia', 'politicas'];

export function usePoliticasEstrategicas() {
  return useQuery({ queryKey: QUERY_KEY, queryFn: getPoliticasDaEmpresa });
}

export function useSalvarPoliticas(empresaId: string | undefined, usuarioId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PoliticasEmpresaInput) => {
      if (!empresaId || !usuarioId) {
        throw new Error('Empresa ou usuário não identificado — recarregue a página e tente novamente.');
      }
      return salvarPoliticas(empresaId, usuarioId, payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
