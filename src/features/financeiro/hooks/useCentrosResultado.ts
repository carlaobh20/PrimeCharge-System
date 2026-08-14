import { useQuery } from '@tanstack/react-query';
import { listCentrosResultado } from '../api/centrosResultado';

export function useCentrosResultado() {
  return useQuery({ queryKey: ['centros-resultado'], queryFn: listCentrosResultado });
}
