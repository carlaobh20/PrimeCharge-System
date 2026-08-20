import { supabase } from '@/shared/lib/supabase';

// Vistorias do motorista — LEITURA das próprias (RLS migration 0040). O motorista consulta a
// vistoria de entrega/devolução do próprio contrato (com fotos, via signed URL). A EXECUÇÃO de
// vistoria pelo motorista é uma fase à parte: concluir uma vistoria de entrega/devolução
// ativa/encerra o contrato (fn_propagar_status_vistoria) — alavanca que exige validação do
// staff. Ver relatório da Fase 2.

export type MinhaVistoria = {
  id: string;
  titulo: string;
  tipo: string | null;
  status: string;
  odometro_km: number | null;
  carga_pct: number | null;
  observacoes: string | null;
  assinatura_url: string | null;
  contrato_id: string | null;
  concluido_em: string | null;
  criado_em: string;
};

export type MinhaVistoriaItem = {
  id: string;
  descricao: string;
  aplicavel: string | null;
  observacao: string | null;
  foto_url: string | null;
};

export async function listMinhasVistorias(): Promise<MinhaVistoria[]> {
  const { data, error } = await supabase
    .from('checklists')
    .select('id, titulo, tipo, status, odometro_km, carga_pct, observacoes, assinatura_url, contrato_id, concluido_em, criado_em')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MinhaVistoria[];
}

export async function listItensDaVistoria(checklistId: string): Promise<MinhaVistoriaItem[]> {
  const { data, error } = await supabase
    .from('checklist_itens')
    .select('id, descricao, aplicavel, observacao, foto_url')
    .eq('checklist_id', checklistId)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MinhaVistoriaItem[];
}
