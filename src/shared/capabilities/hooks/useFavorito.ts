import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addFavorito, getFavorito, removeFavorito } from '../api/favoritos';

export function useFavorito(
  entidadeTipo: string,
  entidadeId: string,
  usuarioId: string | undefined,
  empresaId: string | undefined
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['favorito', entidadeTipo, entidadeId, usuarioId],
    queryFn: () => getFavorito(entidadeTipo, entidadeId, usuarioId!),
    enabled: !!entidadeId && !!usuarioId,
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!usuarioId || !empresaId) return;
      if (query.data) {
        await removeFavorito(query.data.id);
      } else {
        await addFavorito({ empresaId, entidadeTipo, entidadeId, usuarioId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorito', entidadeTipo, entidadeId, usuarioId] });
    },
  });

  return { favorito: query.data, isLoading: query.isLoading, toggle };
}
