import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMarca, listMarcas } from '../api/marcas';
import { createModelo, listModelosPorMarca } from '../api/modelos';

export function useMarcas() {
  return useQuery({
    queryKey: ['marcas'],
    queryFn: listMarcas,
    staleTime: 5 * 60_000,
  });
}

export function useCreateMarca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMarca,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marcas'] }),
  });
}

export function useModelosPorMarca(marcaId: string | undefined) {
  return useQuery({
    queryKey: ['modelos', marcaId],
    queryFn: () => listModelosPorMarca(marcaId!),
    enabled: !!marcaId,
    staleTime: 5 * 60_000,
  });
}

export function useCreateModelo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ marcaId, nome }: { marcaId: string; nome: string }) => createModelo(marcaId, nome),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['modelos', variables.marcaId] }),
  });
}
