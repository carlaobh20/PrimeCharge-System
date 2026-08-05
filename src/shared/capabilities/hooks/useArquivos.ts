import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteArquivo, listArquivos, uploadArquivo } from '../api/arquivos';
import type { Arquivo } from '../types';

export function useArquivos(entidadeTipo: string, entidadeId: string, categoria?: string) {
  return useQuery({
    queryKey: ['arquivos', entidadeTipo, entidadeId, categoria ?? null],
    queryFn: () => listArquivos(entidadeTipo, entidadeId, categoria),
    enabled: !!entidadeId,
  });
}

export function useUploadArquivo(entidadeTipo: string, entidadeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadArquivo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arquivos', entidadeTipo, entidadeId] });
    },
  });
}

export function useDeleteArquivo(entidadeTipo: string, entidadeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (arquivo: Arquivo) => deleteArquivo(arquivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arquivos', entidadeTipo, entidadeId] });
    },
  });
}
