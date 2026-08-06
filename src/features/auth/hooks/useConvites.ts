import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createConvite, deleteConvite, listConvitesPendentesPorEmpresa } from '../api/convites';
import type { UserRole } from '@/shared/types/database';

export function useConvitesPendentes() {
  return useQuery({
    queryKey: ['convites', 'pendentes'],
    queryFn: listConvitesPendentesPorEmpresa,
  });
}

function invalidateConvites(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['convites'] });
}

export function useCreateConvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: { email: string; role: UserRole } }) =>
      createConvite(empresaId, payload),
    onSuccess: () => invalidateConvites(queryClient),
  });
}

export function useDeleteConvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteConvite,
    onSuccess: () => invalidateConvites(queryClient),
  });
}
