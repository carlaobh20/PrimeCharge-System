import { useQuery } from '@tanstack/react-query';
import { listUsuariosPorEmpresa } from '../api/usuarios';

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios', 'lista'],
    queryFn: listUsuariosPorEmpresa,
  });
}
