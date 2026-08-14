import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInteracao } from '../api/interacoes';

export function useCreateInteracao(entidadeTipo: string, entidadeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInteracao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', entidadeTipo, entidadeId] });
    },
  });
}
