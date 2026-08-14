import { useQuery } from '@tanstack/react-query';
import { listPlanoContas } from '../api/planoContas';

export function usePlanoContas() {
  return useQuery({ queryKey: ['plano-contas'], queryFn: listPlanoContas });
}
