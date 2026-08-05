import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addTag, listTags, removeTag } from '../api/tags';

export function useTags(entidadeTipo: string, entidadeId: string) {
  return useQuery({
    queryKey: ['tags', entidadeTipo, entidadeId],
    queryFn: () => listTags(entidadeTipo, entidadeId),
    enabled: !!entidadeId,
  });
}

export function useAddTag(entidadeTipo: string, entidadeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', entidadeTipo, entidadeId] });
    },
  });
}

export function useRemoveTag(entidadeTipo: string, entidadeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', entidadeTipo, entidadeId] });
    },
  });
}
