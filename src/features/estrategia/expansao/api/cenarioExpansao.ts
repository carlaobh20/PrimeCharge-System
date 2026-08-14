import { supabase, assertLinhaAfetada } from '@/shared/lib/supabase';
import type { CenarioExpansao, CenarioExpansaoInput } from '../types';

// Épico 9 — Motor de Expansão, Fase 1. CRUD sobre cenario_expansao (migration 0032), mesmo
// padrão de features/estrategia/api/simulacao.ts (Central de Decisão) — N cenários por empresa,
// mais recentemente editado primeiro.

export async function listCenariosExpansao(): Promise<CenarioExpansao[]> {
  const { data, error } = await supabase.from('cenario_expansao').select('*').order('atualizado_em', { ascending: false });
  if (error) throw error;
  return data as CenarioExpansao[];
}

export async function criarCenarioExpansao(
  empresaId: string,
  criadoPor: string | undefined,
  payload: CenarioExpansaoInput
): Promise<CenarioExpansao> {
  const { data, error } = await supabase
    .from('cenario_expansao')
    .insert({ empresa_id: empresaId, criado_por: criadoPor ?? null, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data as CenarioExpansao;
}

export async function atualizarCenarioExpansao(id: string, payload: Partial<CenarioExpansaoInput>): Promise<CenarioExpansao> {
  const { data, error } = await supabase.from('cenario_expansao').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as CenarioExpansao;
}

export async function excluirCenarioExpansao(id: string): Promise<void> {
  const { data, error } = await supabase.from('cenario_expansao').delete().eq('id', id).select('id');
  if (error) throw error;
  assertLinhaAfetada(data);
}
