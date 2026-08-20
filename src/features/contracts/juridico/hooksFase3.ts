// Hooks da Fase 3 — TanStack Query sobre apiFase3. Inclui o agregador da Ficha Jurídica
// (uma passada: seguro + rescisões + multas + sinistros + vistorias + financeiro) que alimenta
// a ficha, o score de risco e o dossiê sem N+1 espalhado pela tela.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPolitica,
  createRescisao,
  createRevisao,
  listMultasPorContrato,
  listParametros,
  listPoliticas,
  listRescisoesPorContrato,
  listRevisoes,
  listRevisoesPorTemplate,
  listSegurosPorContrato,
  listSinistrosPorContrato,
  listVistoriasPorContrato,
  resumoFinanceiroContrato,
  updatePolitica,
  updateRescisao,
  upsertParametro,
  upsertSeguro,
  type ContratoPolitica,
  type ContratoRescisao,
  type ContratoSeguro,
  type RevisaoJuridicaStatus,
} from './apiFase3';

function invalidarFase3(qc: ReturnType<typeof useQueryClient>, contratoId?: string) {
  qc.invalidateQueries({ queryKey: ['juridico'] });
  if (contratoId) qc.invalidateQueries({ queryKey: ['timeline', 'contrato', contratoId] });
}

// ============================ POLÍTICAS ============================
export function usePoliticas() {
  return useQuery({ queryKey: ['juridico', 'politicas'], queryFn: listPoliticas });
}

export function useSavePolitica() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, id, payload }: { empresaId: string; id?: string; payload: Partial<ContratoPolitica> & { nome: string } }) =>
      id ? updatePolitica(id, payload) : createPolitica(empresaId, payload),
    onSuccess: () => invalidarFase3(qc),
  });
}

// ============================ SEGURO ============================
export function useSeguros(contratoId: string | undefined) {
  return useQuery({
    queryKey: ['juridico', 'seguros', contratoId],
    queryFn: () => listSegurosPorContrato(contratoId!),
    enabled: !!contratoId,
  });
}

export function useSaveSeguro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, contratoId, id, payload }: { empresaId: string; contratoId: string; id?: string; payload: Partial<ContratoSeguro> }) =>
      upsertSeguro(empresaId, contratoId, payload, id),
    onSuccess: (s) => invalidarFase3(qc, s.contrato_id),
  });
}

// ============================ RESCISÃO ============================
export function useRescisoes(contratoId: string | undefined) {
  return useQuery({
    queryKey: ['juridico', 'rescisoes', contratoId],
    queryFn: () => listRescisoesPorContrato(contratoId!),
    enabled: !!contratoId,
  });
}

export function useCreateRescisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, payload }: { empresaId: string; payload: Parameters<typeof createRescisao>[1] }) =>
      createRescisao(empresaId, payload),
    onSuccess: (r) => invalidarFase3(qc, r.contrato_id),
  });
}

export function useUpdateRescisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Pick<ContratoRescisao, 'status' | 'checklist' | 'valores' | 'observacoes' | 'data_agendada' | 'responsavel_id'>> }) =>
      updateRescisao(id, payload),
    onSuccess: (r) => invalidarFase3(qc, r.contrato_id),
  });
}

// ============================ REVISÃO JURÍDICA ============================
export function useRevisoesTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['juridico', 'revisoes', templateId],
    queryFn: () => listRevisoesPorTemplate(templateId!),
    enabled: !!templateId,
  });
}

export function useTodasRevisoes() {
  return useQuery({ queryKey: ['juridico', 'revisoes', 'todas'], queryFn: listRevisoes });
}

export function useCreateRevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      empresaId,
      payload,
    }: {
      empresaId: string;
      payload: { template_id: string; versao_template: number; responsavel_id?: string | null; responsavel_nome?: string | null; status: RevisaoJuridicaStatus; observacoes?: string | null };
    }) => createRevisao(empresaId, payload),
    onSuccess: () => invalidarFase3(qc),
  });
}

// ============================ PARÂMETROS ============================
export function useParametrosJuridicos() {
  return useQuery({ queryKey: ['juridico', 'parametros'], queryFn: listParametros });
}

export function useSaveParametro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empresaId, chave, valor, usuarioId }: { empresaId: string; chave: string; valor: Record<string, unknown>; usuarioId?: string }) =>
      upsertParametro(empresaId, chave, valor, usuarioId),
    onSuccess: () => invalidarFase3(qc),
  });
}

// ============================ FICHA JURÍDICA (agregador por contrato) ============================
export function useFichaJuridica(contratoId: string | undefined) {
  return useQuery({
    queryKey: ['juridico', 'ficha', contratoId],
    enabled: !!contratoId,
    queryFn: async () => {
      const [seguros, rescisoes, multas, sinistros, vistorias, financeiro] = await Promise.all([
        listSegurosPorContrato(contratoId!),
        listRescisoesPorContrato(contratoId!),
        listMultasPorContrato(contratoId!),
        listSinistrosPorContrato(contratoId!),
        listVistoriasPorContrato(contratoId!),
        resumoFinanceiroContrato(contratoId!),
      ]);
      return { seguros, rescisoes, multas, sinistros, vistorias, financeiro };
    },
  });
}
