import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSinistro, listSinistrosPorEmpresa, listSinistrosPorVeiculo, type SinistroInput } from '../api/sinistros';

export function useSinistrosPorVeiculo(veiculoId: string | undefined) {
  return useQuery({
    queryKey: ['sinistros', 'veiculo', veiculoId],
    queryFn: () => listSinistrosPorVeiculo(veiculoId!),
    enabled: !!veiculoId,
  });
}

export function useSinistrosPorEmpresa() {
  return useQuery({
    queryKey: ['sinistros', 'empresa'],
    queryFn: listSinistrosPorEmpresa,
  });
}

export function useCreateSinistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: SinistroInput }) => createSinistro(empresaId, payload),
    onSuccess: (data) => {
      if (data.veiculo_id) queryClient.invalidateQueries({ queryKey: ['sinistros', 'veiculo', data.veiculo_id] });
      queryClient.invalidateQueries({ queryKey: ['sinistros', 'empresa'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}
