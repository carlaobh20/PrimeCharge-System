import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  concluirVistoria,
  createChecklist,
  createVistoria,
  getChecklist,
  getVistoriaComComparacao,
  listChecklistsPorEmpresa,
  listChecklistsPorEntidade,
  removeFotoItem,
  responderChecklistItem,
  updateChecklistStatus,
  updateVistoriaCampos,
  uploadAssinaturaVistoria,
  uploadFotoItem,
  type ChecklistInput,
  type VistoriaInput,
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
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: { resposta: boolean | null; observacao?: string | null; aplicavel?: boolean };
    }) => responderChecklistItem(itemId, payload),
    onSuccess: () => invalidateChecklists(queryClient),
  });
}

// ============================================================
// Épico 8 — Vistoria real
// ============================================================

export function useCreateVistoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, input }: { empresaId: string; input: VistoriaInput }) => createVistoria(empresaId, input),
    onSuccess: (data) => invalidateChecklists(queryClient, 'veiculo', data.entidade_id),
  });
}

export function useUpdateVistoriaCampos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateVistoriaCampos>[1] }) =>
      updateVistoriaCampos(id, payload),
    onSuccess: (data) => invalidateChecklists(queryClient, 'veiculo', data.entidade_id),
  });
}

export function useUploadFotoItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof uploadFotoItem>[0]) => uploadFotoItem(params),
    onSuccess: () => invalidateChecklists(queryClient),
  });
}

export function useRemoveFotoItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, fotoUrl }: { itemId: string; fotoUrl: string }) => removeFotoItem(itemId, fotoUrl),
    onSuccess: () => invalidateChecklists(queryClient),
  });
}

export function useUploadAssinaturaVistoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof uploadAssinaturaVistoria>[0]) => uploadAssinaturaVistoria(params),
    onSuccess: (data) => invalidateChecklists(queryClient, 'veiculo', data.entidade_id),
  });
}

export function useConcluirVistoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof concluirVistoria>[1] }) => concluirVistoria(id, payload),
    onSuccess: (data) => {
      invalidateChecklists(queryClient, 'veiculo', data.entidade_id);
      // Vistoria concluída propaga pro contrato/veículo no banco (trigger) — invalida os dois
      // pra a UI de fora do painel de checklist (cockpit do contrato, ficha do veículo) refletir.
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['sinistros'] });
    },
  });
}

export function useVistoriaComComparacao(id: string | undefined) {
  return useQuery({
    queryKey: ['checklists', 'comparacao', id],
    queryFn: () => getVistoriaComComparacao(id!),
    enabled: !!id,
  });
}
