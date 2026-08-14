import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { arquivarFunilEtapa, createFunilEtapa, listFunilEtapas } from '../api/funilEtapas';
import type { FunilEtapaGrupo } from '../types';

export function useFunilEtapas(empresaId: string | undefined) {
  return useQuery({
    queryKey: ['funil-etapas', empresaId],
    queryFn: () => listFunilEtapas(empresaId!),
    enabled: !!empresaId,
  });
}

export function useCriarFunilEtapa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, nome, grupo, ordem }: { empresaId: string; nome: string; grupo: FunilEtapaGrupo; ordem: number }) =>
      createFunilEtapa(empresaId, nome, grupo, ordem),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['funil-etapas', variables.empresaId] });
    },
  });
}

export function useArquivarFunilEtapa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: arquivarFunilEtapa,
    onSuccess: () => {
      // empresaId não vem no retorno da mutation de forma tipada aqui — invalida todo o
      // grupo de queries de funil-etapas (mesmo padrão já usado em invalidations amplas
      // deste projeto quando o custo de invalidar "a mais" é desprezível).
      queryClient.invalidateQueries({ queryKey: ['funil-etapas'] });
    },
  });
}
