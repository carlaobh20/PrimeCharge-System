import { useQuery } from '@tanstack/react-query';
import { listTimeline } from '../api/timeline';

export function useTimeline(entidadeTipo: string, entidadeId: string) {
  return useQuery({
    queryKey: ['timeline', entidadeTipo, entidadeId],
    queryFn: () => listTimeline(entidadeTipo, entidadeId),
    enabled: !!entidadeId,
  });
}
