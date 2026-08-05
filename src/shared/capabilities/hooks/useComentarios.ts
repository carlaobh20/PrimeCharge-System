import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createComentario, deleteComentario, listComentarios, updateComentario } from '../api/comentarios';

export function useComentarios(entidadeTipo: string, entidadeId: string) {
  return useQuery({
    queryKey: ['comentarios', entidadeTipo, entidadeId],
    queryFn: () => listComentarios(entidadeTipo, entidadeId),
    enabled: !!entidadeId,
  });
}

export function useCreateComentario(entidadeTipo: string, entidadeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createComentario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comentarios', entidadeTipo, entidadeId] });
    },
  });
}

export function useUpdateComentario(entidadeTipo: string, entidadeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, texto }: { id: string; texto: string }) => updateComentario(id, texto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comentarios', entidadeTipo, entidadeId] });
    },
  });
}

export function useDeleteComentario(entidadeTipo: string, entidadeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteComentario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comentarios', entidadeTipo, entidadeId] });
    },
  });
}
