import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCentroCusto, listCentrosCusto, updateCentroCusto, type CentroCustoInput } from '../api/centrosCusto';

export function useCentrosCusto() {
  return useQuery({ queryKey: ['centros-custo'], queryFn: listCentrosCusto });
}

export function useCreateCentroCusto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: CentroCustoInput }) =>
      createCentroCusto(empresaId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['centros-custo'] }),
  });
}

export function useUpdateCentroCusto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CentroCustoInput> }) => updateCentroCusto(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['centros-custo'] }),
  });
}
