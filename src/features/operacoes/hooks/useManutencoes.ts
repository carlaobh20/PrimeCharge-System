import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createManutencao, deleteManutencao, listManutencoesPorVeiculo, type ManutencaoInput } from '../api/manutencoes';

export function useManutencoesPorVeiculo(veiculoId: string | undefined) {
  return useQuery({
    queryKey: ['manutencoes', 'veiculo', veiculoId],
    queryFn: () => listManutencoesPorVeiculo(veiculoId!),
    enabled: !!veiculoId,
  });
}

function invalidateManutencoes(queryClient: ReturnType<typeof useQueryClient>, veiculoId: string) {
  queryClient.invalidateQueries({ queryKey: ['manutencoes', 'veiculo', veiculoId] });
  queryClient.invalidateQueries({ queryKey: ['timeline'] });
}

export function useCreateManutencao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: ManutencaoInput }) =>
      createManutencao(empresaId, payload),
    onSuccess: (data) => invalidateManutencoes(queryClient, data.veiculo_id),
  });
}

export function useDeleteManutencao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; veiculoId: string }) => deleteManutencao(id),
    onSuccess: (_data, variables) => invalidateManutencoes(queryClient, variables.veiculoId),
  });
}
