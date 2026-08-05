import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContaBancaria, listContasBancarias, updateContaBancaria, type ContaBancariaInput } from '../api/contasBancarias';

export function useContasBancarias() {
  return useQuery({ queryKey: ['contas-bancarias'], queryFn: listContasBancarias });
}

export function useCreateContaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: ContaBancariaInput }) =>
      createContaBancaria(empresaId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] }),
  });
}

export function useUpdateContaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ContaBancariaInput> }) => updateContaBancaria(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] }),
  });
}
