import { supabase } from '@/shared/lib/supabase';
import type { DespesaMeta, GrupoDespesa, PeriodicidadeDespesa } from '../lib/metas';

// MINHA META — API do portal (migration 0047). Regras do portal (R4 da Fase 1 de segurança):
// NENHUM select('*'); colunas explícitas; RLS 0047 garante que o motorista só alcança as
// PRÓPRIAS linhas (staff não tem policy nenhuma — despesa pessoal é privada do motorista).
// O aluguel do carro NUNCA passa por aqui: é derivado de listMeusContratos (Módulo 32).

const COLS_DESPESA = 'id, grupo, categoria, nome, dependente, valor, periodicidade, vencimento_dia, obrigatoria, ativa';
const COLS_CONFIG = 'motorista_id, dias_trabalho, renda_hora, reserva_meta, reserva_atual, reserva_contribuicao_mensal';
const COLS_OBJETIVO = 'id, nome, categoria, valor_meta, valor_atual, prazo, ativo';
const COLS_GANHO = 'id, data, valor, horas, observacao';
const COLS_SNAPSHOT = 'id, mes, total, por_grupo';

export type DespesaRow = DespesaMeta & { vencimento_dia: number | null };

export async function listDespesas(): Promise<DespesaRow[]> {
  const { data, error } = await supabase.from('motorista_despesas').select(COLS_DESPESA).order('criado_em', { ascending: true });
  if (error) throw error;
  return data as DespesaRow[];
}

export async function criarDespesa(motoristaId: string, d: {
  grupo: GrupoDespesa;
  categoria: string;
  nome: string;
  dependente?: string | null;
  valor: number;
  periodicidade: PeriodicidadeDespesa;
  vencimento_dia?: number | null;
  obrigatoria?: boolean;
}): Promise<DespesaRow> {
  const { data, error } = await supabase
    .from('motorista_despesas')
    .insert({ motorista_id: motoristaId, ...d })
    .select(COLS_DESPESA)
    .single();
  if (error) throw error;
  return data as DespesaRow;
}

export async function atualizarDespesa(id: string, patch: Partial<Pick<DespesaRow, 'nome' | 'categoria' | 'valor' | 'periodicidade' | 'vencimento_dia' | 'obrigatoria' | 'ativa' | 'dependente'>>): Promise<void> {
  const { error } = await supabase.from('motorista_despesas').update(patch).eq('id', id);
  if (error) throw error;
}

export async function removerDespesa(id: string): Promise<void> {
  const { error } = await supabase.from('motorista_despesas').delete().eq('id', id);
  if (error) throw error;
}

// ---------------- CONFIG ----------------

export type MetaConfig = {
  motorista_id: string;
  dias_trabalho: number;
  renda_hora: number;
  reserva_meta: number | null;
  reserva_atual: number | null;
  reserva_contribuicao_mensal: number | null;
};

export async function getConfig(): Promise<MetaConfig | null> {
  const { data, error } = await supabase.from('motorista_meta_config').select(COLS_CONFIG).maybeSingle();
  if (error) throw error;
  return data as MetaConfig | null;
}

export async function salvarConfig(motoristaId: string, patch: Partial<Omit<MetaConfig, 'motorista_id'>>): Promise<void> {
  const { error } = await supabase
    .from('motorista_meta_config')
    .upsert({ motorista_id: motoristaId, ...patch }, { onConflict: 'motorista_id' });
  if (error) throw error;
}

// ---------------- OBJETIVOS ----------------

export type ObjetivoRow = {
  id: string;
  nome: string;
  categoria: string;
  valor_meta: number;
  valor_atual: number;
  prazo: string | null;
  ativo: boolean;
};

export async function listObjetivos(): Promise<ObjetivoRow[]> {
  const { data, error } = await supabase.from('motorista_objetivos').select(COLS_OBJETIVO).eq('ativo', true).order('criado_em');
  if (error) throw error;
  return data as ObjetivoRow[];
}

export async function salvarObjetivo(motoristaId: string, o: { id?: string; nome: string; categoria: string; valor_meta: number; valor_atual: number; prazo: string | null }): Promise<void> {
  if (o.id) {
    const { error } = await supabase.from('motorista_objetivos').update({ nome: o.nome, categoria: o.categoria, valor_meta: o.valor_meta, valor_atual: o.valor_atual, prazo: o.prazo }).eq('id', o.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('motorista_objetivos').insert({ motorista_id: motoristaId, nome: o.nome, categoria: o.categoria, valor_meta: o.valor_meta, valor_atual: o.valor_atual, prazo: o.prazo });
    if (error) throw error;
  }
}

export async function arquivarObjetivo(id: string): Promise<void> {
  const { error } = await supabase.from('motorista_objetivos').update({ ativo: false }).eq('id', id);
  if (error) throw error;
}

// ---------------- GANHOS (lançamento manual do realizado) ----------------

export type GanhoRow = { id: string; data: string; valor: number; horas: number | null; observacao: string | null };

export async function listGanhosDoMes(anoMes: string /* 'YYYY-MM' */): Promise<GanhoRow[]> {
  const inicio = `${anoMes}-01`;
  const [ano, mes] = anoMes.split('-').map(Number);
  const fim = `${anoMes}-${String(new Date(ano, mes, 0).getDate()).padStart(2, '0')}`;
  const { data, error } = await supabase
    .from('motorista_ganhos')
    .select(COLS_GANHO)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data');
  if (error) throw error;
  return data as GanhoRow[];
}

export async function lancarGanho(motoristaId: string, g: { data: string; valor: number; horas?: number | null; observacao?: string | null }): Promise<void> {
  const { error } = await supabase
    .from('motorista_ganhos')
    .upsert({ motorista_id: motoristaId, ...g }, { onConflict: 'motorista_id,data' });
  if (error) throw error;
}

// ---------------- SNAPSHOTS MENSAIS (histórico — Módulo 27) ----------------

export type SnapshotRow = { id: string; mes: string; total: number; por_grupo: Record<string, number> };

export async function listSnapshots(): Promise<SnapshotRow[]> {
  const { data, error } = await supabase.from('motorista_custos_snapshots').select(COLS_SNAPSHOT).order('mes', { ascending: false }).limit(12);
  if (error) throw error;
  return data as SnapshotRow[];
}

/** Upsert do mês corrente — chamado quando a tela abre com dados (ação do usuário; sem cron). */
export async function gravarSnapshotDoMes(motoristaId: string, mesIso: string, total: number, porGrupo: Record<string, number>): Promise<void> {
  const { error } = await supabase
    .from('motorista_custos_snapshots')
    .upsert({ motorista_id: motoristaId, mes: mesIso, total, por_grupo: porGrupo }, { onConflict: 'motorista_id,mes' });
  if (error) throw error;
}
