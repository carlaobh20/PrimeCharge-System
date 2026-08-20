import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listVistoriasAguardando, listDocumentosAguardando, revisarDocumento,
  listChamadosAbertos, mudarStatusChamado, listAnexosDoChamado,
  type ChamadoStatus,
} from '../api/atendimento';

const K = (...p: string[]) => ['atendimento', ...p];

export function useVistoriasAguardando() {
  return useQuery({ queryKey: K('vistorias'), queryFn: listVistoriasAguardando });
}
export function useDocumentosAguardando() {
  return useQuery({ queryKey: K('documentos'), queryFn: listDocumentosAguardando });
}
export function useChamadosAbertos() {
  return useQuery({ queryKey: K('chamados'), queryFn: listChamadosAbertos });
}
export function useAnexosDoChamado(chamadoId: string) {
  return useQuery({ queryKey: K('anexos', chamadoId), queryFn: () => listAnexosDoChamado(chamadoId), enabled: !!chamadoId });
}

export function useRevisarDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { arquivoId: string; status: 'aprovado' | 'rejeitado'; motivo: string | null }) =>
      revisarDocumento(a.arquivoId, a.status, a.motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: K('documentos') }),
  });
}
export function useMudarStatusChamado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { chamadoId: string; status: ChamadoStatus }) => mudarStatusChamado(a.chamadoId, a.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: K('chamados') }),
  });
}
