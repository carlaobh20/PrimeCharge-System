import { supabase } from '@/shared/lib/supabase';
import { lerTolerante } from './schemaGuard';
import type { DespesaMeta, GrupoDespesa, PeriodicidadeDespesa } from '../lib/metas';

// MINHA META — API do portal (migration 0047). Regras do portal (R4 da Fase 1 de segurança):
// NENHUM select('*'); colunas explícitas; RLS 0047 garante que o motorista só alcança as
// PRÓPRIAS linhas (staff não tem policy nenhuma — despesa pessoal é privada do motorista).
// O aluguel do carro NUNCA passa por aqui: é derivado de listMeusContratos (Módulo 32).

const COLS_DESPESA = 'id, grupo, categoria, nome, dependente, valor, periodicidade, vencimento_dia, obrigatoria, ativa';
const COLS_CONFIG = 'motorista_id, dias_trabalho, renda_hora, reserva_meta, reserva_atual, reserva_contribuicao_mensal';
const COLS_OBJETIVO = 'id, nome, categoria, valor_meta, valor_atual, prazo, ativo';
const COLS_GANHO = 'id, data, valor, horas, observacao, km_inicio, km_fim, corridas, apps';
const COLS_RECARGA = 'id, data, custo, kwh, pct_inicial, pct_final, local';
const COLS_SNAPSHOT = 'id, mes, total, por_grupo';

export type DespesaRow = DespesaMeta & { vencimento_dia: number | null };

export async function listDespesas(): Promise<DespesaRow[]> {
  return lerTolerante('minha-meta', async () => {
    const { data, error } = await supabase.from('motorista_despesas').select(COLS_DESPESA).order('criado_em', { ascending: true });
    if (error) throw error;
    return data as DespesaRow[];
  }, []);
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
  return lerTolerante('minha-meta', async () => {
    const { data, error } = await supabase.from('motorista_meta_config').select(COLS_CONFIG).maybeSingle();
    if (error) throw error;
    return data as MetaConfig | null;
  }, null);
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
  return lerTolerante('minha-meta', async () => {
    const { data, error } = await supabase.from('motorista_objetivos').select(COLS_OBJETIVO).eq('ativo', true).order('criado_em');
    if (error) throw error;
    return data as ObjetivoRow[];
  }, []);
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

export type GanhoRow = {
  id: string;
  data: string;
  valor: number;
  horas: number | null;
  observacao: string | null;
  // Fase 12.1 — diário operacional (todos opcionais; km_rodado é DERIVADO no motor)
  km_inicio: number | null;
  km_fim: number | null;
  corridas: number | null;
  apps: string[] | null;
};

/** Consulta ÚNICA por período (Fase 10) — as janelas 7/14/30 e o mês reusam esta função. */
export async function listGanhosPeriodo(inicioIso: string, fimIso: string): Promise<GanhoRow[]> {
  return lerTolerante('minha-meta', async () => {
    const { data, error } = await supabase
      .from('motorista_ganhos')
      .select(COLS_GANHO)
      .gte('data', inicioIso)
      .lte('data', fimIso)
      .order('data');
    if (error) throw error;
    return data as GanhoRow[];
  }, []);
}

export async function listGanhosDoMes(anoMes: string /* 'YYYY-MM' */): Promise<GanhoRow[]> {
  const [ano, mes] = anoMes.split('-').map(Number);
  return listGanhosPeriodo(`${anoMes}-01`, `${anoMes}-${String(new Date(ano, mes, 0).getDate()).padStart(2, '0')}`);
}

export async function lancarGanho(motoristaId: string, g: {
  data: string;
  valor: number;
  horas?: number | null;
  observacao?: string | null;
  km_inicio?: number | null;
  km_fim?: number | null;
  corridas?: number | null;
  apps?: string[] | null;
}): Promise<void> {
  const { error } = await supabase
    .from('motorista_ganhos')
    .upsert({ motorista_id: motoristaId, ...g }, { onConflict: 'motorista_id,data' });
  if (error) throw error;
}

// ---------------- RECARGAS POR EVENTO (Fase 12.1 — ≠ despesa recorrente) ----------------

export type RecargaRow = {
  id: string;
  data: string;
  custo: number;
  kwh: number | null;
  pct_inicial: number | null;
  pct_final: number | null;
  local: string | null;
};

export async function listRecargasPeriodo(inicioIso: string, fimIso: string): Promise<RecargaRow[]> {
  return lerTolerante('minha-meta', async () => {
    const { data, error } = await supabase
      .from('motorista_recargas')
      .select(COLS_RECARGA)
      .gte('data', inicioIso)
      .lte('data', fimIso)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as RecargaRow[];
  }, []);
}

export async function criarRecarga(motoristaId: string, r: {
  data: string;
  custo: number;
  kwh?: number | null;
  pct_inicial?: number | null;
  pct_final?: number | null;
  local?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('motorista_recargas').insert({ motorista_id: motoristaId, ...r });
  if (error) throw error;
}

export async function removerRecarga(id: string): Promise<void> {
  const { error } = await supabase.from('motorista_recargas').delete().eq('id', id);
  if (error) throw error;
}

// ---------------- SNAPSHOTS MENSAIS (histórico — Módulo 27) ----------------

export type SnapshotRow = { id: string; mes: string; total: number; por_grupo: Record<string, number> };

export async function listSnapshots(): Promise<SnapshotRow[]> {
  return lerTolerante('minha-meta', async () => {
    const { data, error } = await supabase.from('motorista_custos_snapshots').select(COLS_SNAPSHOT).order('mes', { ascending: false }).limit(12);
    if (error) throw error;
    return data as SnapshotRow[];
  }, []);
}

/** Upsert do mês corrente — chamado quando a tela abre com dados (ação do usuário; sem cron). */
export async function gravarSnapshotDoMes(motoristaId: string, mesIso: string, total: number, porGrupo: Record<string, number>): Promise<void> {
  const { error } = await supabase
    .from('motorista_custos_snapshots')
    .upsert({ motorista_id: motoristaId, mes: mesIso, total, por_grupo: porGrupo }, { onConflict: 'motorista_id,mes' });
  if (error) throw error;
}
