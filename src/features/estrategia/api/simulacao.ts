import { supabase, assertLinhaAfetada } from '@/shared/lib/supabase';
import type { CenarioSimulacao, CenarioSimulacaoInput, MarcoCrescimento, MarcoCrescimentoInput } from '../types';

// Cenário — singleton por empresa, mesmo padrão de politicas_empresa/api/politicas.ts.
export async function getCenarioSimulacao(): Promise<CenarioSimulacao | null> {
  const { data, error } = await supabase.from('cenario_simulacao').select('*').maybeSingle();
  if (error) throw error;
  return data as CenarioSimulacao | null;
}

export async function salvarCenarioSimulacao(
  empresaId: string,
  criadoPor: string | undefined,
  payload: CenarioSimulacaoInput
): Promise<CenarioSimulacao> {
  const { data, error } = await supabase
    .from('cenario_simulacao')
    .upsert({ empresa_id: empresaId, criado_por: criadoPor ?? null, ...payload }, { onConflict: 'empresa_id' })
    .select()
    .single();
  if (error) throw error;
  return data as CenarioSimulacao;
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
