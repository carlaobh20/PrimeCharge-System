import { supabase, assertLinhaAfetada } from '@/shared/lib/supabase';
import type { CenarioSimulacao, CenarioSimulacaoInput, MarcoCrescimento, MarcoCrescimentoInput } from '../types';

// Central de Decisão v2 — cenário deixou de ser singleton (Comparador de Cenários precisa de
// N por empresa, ver migration 0017). `listCenarios` ordena pelo mais recentemente editado
// primeiro — a Central de Decisão abre sempre no último cenário que o dono estava mexendo.
export async function listCenarios(): Promise<CenarioSimulacao[]> {
  const { data, error } = await supabase.from('cenario_simulacao').select('*').order('atualizado_em', { ascending: false });
  if (error) throw error;
  return data as CenarioSimulacao[];
}

export async function criarCenario(
  empresaId: string,
  criadoPor: string | undefined,
  payload: CenarioSimulacaoInput
): Promise<CenarioSimulacao> {
  const { data, error } = await supabase
    .from('cenario_simulacao')
    .insert({ empresa_id: empresaId, criado_por: criadoPor ?? null, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data as CenarioSimulacao;
}

export async function atualizarCenario(id: string, payload: Partial<CenarioSimulacaoInput>): Promise<CenarioSimulacao> {
  const { data, error } = await supabase.from('cenario_simulacao').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as CenarioSimulacao;
}

export async function excluirCenario(id: string): Promise<void> {
  const { data, error } = await supabase.from('cenario_simulacao').delete().eq('id', id).select('id');
  if (error) throw error;
  assertLinhaAfetada(data);
}

// Marcos — N por empresa. "Excluir" é soft-delete (ativo=false), não deleta a linha — mantém
// histórico de auditoria (mesmo racional de outras tabelas do projeto que usam `ativo`).
export async function listMarcosCrescimento(): Promise<MarcoCrescimento[]> {
  const { data, error } = await supabase.from('marcos_crescimento').select('*').eq('ativo', true).order('ordem', { ascending: true });
  if (error) throw error;
  return data as MarcoCrescimento[];
}

export async function createMarcoCrescimento(
  empresaId: string,
  criadoPor: string | undefined,
  payload: MarcoCrescimentoInput
): Promise<MarcoCrescimento> {
  const { data, error } = await supabase
    .from('marcos_crescimento')
    .insert({ empresa_id: empresaId, criado_por: criadoPor ?? null, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data as MarcoCrescimento;
}

export async function updateMarcoCrescimento(
  id: string,
  payload: Partial<MarcoCrescimentoInput> & { concluido_manualmente?: boolean }
): Promise<MarcoCrescimento> {
  const { data, error } = await supabase.from('marcos_crescimento').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as MarcoCrescimento;
}

export async function excluirMarcoCrescimento(id: string): Promise<void> {
  const { data, error } = await supabase.from('marcos_crescimento').update({ ativo: false }).eq('id', id).select('id');
  if (error) throw error;
  assertLinhaAfetada(data);
}
