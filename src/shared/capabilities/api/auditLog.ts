import { supabase } from '@/shared/lib/supabase';
import type { AuditLogEntry } from '../types';

// audit_log existe desde a Fase 0 e é populada pelo trigger genérico fn_audit_log()
// (migration 0002) — até a Sprint 2 nenhuma tela lia esse dado. Aba "Histórico" do
// Cockpit do Ativo é a primeira a consumir, sem precisar de nenhuma migration nova.
export async function listAuditLog(tabela: string, registroId: string) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('tabela', tabela)
    .eq('registro_id', registroId)
    .order('criado_em', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as AuditLogEntry[];
}
