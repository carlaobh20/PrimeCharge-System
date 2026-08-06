import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createManutencao,
  deleteManutencao,
  listManutencoesAgendadasPorEmpresa,
  listManutencoesPorVeiculo,
  marcarManutencaoRealizada,
  type ManutencaoInput,
} from '../api/manutencoes';

export function useManutencoesPorVeiculo(veiculoId: string | undefined) {
  return useQuery({
    queryKey: ['manutencoes', 'veiculo', veiculoId],
    queryFn: () => listManutencoesPorVeiculo(veiculoId!),
    enabled: !!veiculoId,
  });
}

// Missão 4 (Fase 3) — usado pelo gerador de Ações Operacionais "manutenção agendada vencendo".
export function useManutencoesAgendadasPorEmpresa() {
  return useQuery({
    queryKey: ['manutencoes', 'agendadas', 'empresa'],
    queryFn: listManutencoesAgendadasPorEmpresa,
  });
}

function invalidateManutencoes(queryClient: ReturnType<typeof useQueryClient>, veiculoId: string) {
  queryClient.invalidateQueries({ queryKey: ['manutencoes', 'veiculo', veiculoId] });
  queryClient.invalidateQueries({ queryKey: ['timeline'] });
}

export function useCreateManutencao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: ManutencaoInput }) =>
      createManutencao(empresaId, payload),
    onSuccess: (data) => invalidateManutencoes(queryClient, data.veiculo_id),
  });
}

export function useDeleteManutencao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; veiculoId: string }) => deleteManutencao(id),
    onSuccess: (_data, variables) => invalidateManutencoes(queryClient, variables.veiculoId),
  });
}

export function useMarcarManutencaoRealizada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dataExecucao, custo }: { id: string; veiculoId: string; dataExecucao: string; custo: number | null }) =>
      marcarManutencaoRealizada(id, { dataExecucao, custo }),
    onSuccess: (data) => {
      invalidateManutencoes(queryClient, data.veiculo_id);
      // Pode ter gerado um Lançamento (fn_manutencao_gera_lancamento) — invalida Financeiro
      // também, mesmo padrão de useEncerrarContrato ao propagar pra Veículos/Motoristas.
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] });
    },
  });
}
