import { supabase, assertLinhaAfetada } from '@/shared/lib/supabase';
import type { Meta, MetaStatus } from '../types';

export async function listMetasPorEmpresa() {
  const { data, error } = await supabase.from('metas').select('*').order('data_alvo', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data as Meta[];
}

export type MetaInput = Omit<Meta, 'id' | 'empresa_id' | 'criado_por' | 'status' | 'criado_em' | 'atualizado_em'>;

export async function createMeta(empresaId: string, criadoPor: string | undefined, payload: MetaInput) {
  const { data, error } = await supabase
    .from('metas')
    .insert({ ...payload, empresa_id: empresaId, criado_por: criadoPor ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Meta;
}

// `valor_atual` é atualizado manualmente (DEC-109) — este endpoint existe separado de um
// updateMeta genérico porque é a ação mais frequente ("atualizar progresso"), sem precisar
// reabrir o formulário inteiro (mesmo racional de updateXStatus em outras features).
export async function atualizarProgressoMeta(id: string, valorAtual: number) {
  const { data, error } = await supabase.from('metas').update({ valor_atual: valorAtual }).eq('id', id).select().single();
  if (error) throw error;
  return data as Meta;
}

export async function updateMetaStatus(id: string, status: MetaStatus) {
  const { data, error } = await supabase.from('metas').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data as Meta;
}

export async function deleteMeta(id: string) {
  const { data, error } = await supabase.from('metas').delete().eq('id', id).select('id');
  if (error) throw error;
  assertLinhaAfetada(data);
}
