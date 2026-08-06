import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createChecklist,
  getChecklist,
  listChecklistsPorEmpresa,
  listChecklistsPorEntidade,
  responderChecklistItem,
  updateChecklistStatus,
  type ChecklistInput,
} from '../api/checklists';
import type { ChecklistStatus } from '../types';

// Sem UI própria nesta sprint (DEC-059) — API/hooks existem para a Sprint 10 (Vistoria
// Inteligente) consumir sem precisar desenhar a capability do zero.
export function useChecklistsPorEntidade(entidadeTipo: string, entidadeId: string) {
  return useQuery({
    queryKey: ['checklists', entidadeTipo, entidadeId],
    queryFn: () => listChecklistsPorEntidade(entidadeTipo, entidadeId),
    enabled: !!entidadeTipo && !!entidadeId,
  });
}

// Missão 4 (Fase 3) — usado pelo gerador de Ações Operacionais "checklist aberto demorado".
export function useChecklistsAbertosPorEmpresa() {
  return useQuery({
    queryKey: ['checklists', 'abertos', 'empresa'],
    queryFn: listChecklistsPorEmpresa,
  });
}

export function useChecklist(id: string | undefined) {
  return useQuery({
    queryKey: ['checklists', 'detalhe', id],
    queryFn: () => getChecklist(id!),
    enabled: !!id,
  });
}

function invalidateChecklists(queryClient: ReturnType<typeof useQueryClient>, entidadeTipo?: string, entidadeId?: string) {
  queryClient.invalidateQueries({ queryKey: ['checklists'] });
  if (entidadeTipo && entidadeId) {
    queryClient.invalidateQueries({ queryKey: ['checklists', entidadeTipo, entidadeId] });
  }
  queryClient.invalidateQueries({ queryKey: ['timeline'] });
}

export function useCreateChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: ChecklistInput }) => createChecklist(empresaId, payload),
    onSuccess: (_data, variables) => invalidateChecklists(queryClient, variables.payload.entidade_tipo, variables.payload.entidade_id),
  });
}

export function useUpdateChecklistStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ChecklistStatus }) => updateChecklistStatus(id, status),
    onSuccess: () => invalidateChecklists(queryClient),
  });
}

export function useResponderChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: { resposta: boolean; observacao?: string | null } }) =>
      responderChecklistItem(itemId, payload),
    onSuccess: () => invalidateChecklists(queryClient),
  });
}
