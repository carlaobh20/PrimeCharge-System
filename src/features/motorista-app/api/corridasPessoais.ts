import { supabase } from '@/shared/lib/supabase';
import { lerTolerante } from '@/shared/lib/schemaGuard';

// COPILOTO DO MOTORISTA — API (migrations 0049/0050, Fase 16). Mesmas regras de finansPessoais.ts
// (R4): NENHUM select('*'); colunas explícitas; RLS 0049/0050 garante que o motorista só alcança
// as PRÓPRIAS linhas. Tag de módulo separada ('copiloto') porque estas migrations podem chegar em
// produção num momento diferente do resto de "minha-meta" — a UI precisa poder avisar isso à parte.

const COLS_CORRIDA = 'id, data, hora, app, valor, km_estimado, duracao_estimada_min, classificacao, aceita, origem_captura, observacao, criado_em';
const COLS_CONFIG_COPILOTO = 'motorista_id, limiar_rpkm_bom, limiar_rpkm_ruim, limiar_rph_bom, limiar_rph_ruim, peso_rpkm, peso_rph, peso_rpcorrida, ativo';

export type CorridaRow = {
  id: string;
  data: string;
  hora: string | null;
  app: string | null;
  valor: number;
  km_estimado: number | null;
  duracao_estimada_min: number | null;
  classificacao: 'BOM' | 'ATENCAO' | 'RUIM' | null;
  aceita: boolean | null;
  origem_captura: string;
  observacao: string | null;
  criado_em: string;
};

/** Consulta ÚNICA por período — histórico (Fase E) e o card do dia reusam esta função. */
export async function listCorridasPeriodo(inicioIso: string, fimIso: string): Promise<CorridaRow[]> {
  return lerTolerante('copiloto', async () => {
    const { data, error } = await supabase
      .from('motorista_corridas')
      .select(COLS_CORRIDA)
      .gte('data', inicioIso)
      .lte('data', fimIso)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false });
    if (error) throw error;
    return data as CorridaRow[];
  }, []);
}

export async function registrarCorrida(motoristaId: string, c: {
  data: string;
  hora?: string | null;
  app?: string | null;
  valor: number;
  km_estimado?: number | null;
  duracao_estimada_min?: number | null;
  classificacao?: 'BOM' | 'ATENCAO' | 'RUIM' | null;
  aceita?: boolean | null;
  origem_captura?: string;
  observacao?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('motorista_corridas')
    .insert({ motorista_id: motoristaId, origem_captura: 'manual', ...c });
  if (error) throw error;
}

export async function removerCorrida(id: string): Promise<void> {
  const { error } = await supabase.from('motorista_corridas').delete().eq('id', id);
  if (error) throw error;
}

// ---------------- CONFIGURAÇÃO DO COPILOTO (critérios do semáforo, Fase B) ----------------

export type ConfigCopilotoRow = {
  motorista_id: string;
  limiar_rpkm_bom: number | null;
  limiar_rpkm_ruim: number | null;
  limiar_rph_bom: number | null;
  limiar_rph_ruim: number | null;
  peso_rpkm: number;
  peso_rph: number;
  peso_rpcorrida: number;
  ativo: boolean;
};

export async function getConfigCopiloto(): Promise<ConfigCopilotoRow | null> {
  return lerTolerante('copiloto', async () => {
    const { data, error } = await supabase.from('motorista_config_copiloto').select(COLS_CONFIG_COPILOTO).maybeSingle();
    if (error) throw error;
    return data as ConfigCopilotoRow | null;
  }, null);
}

export async function salvarConfigCopiloto(motoristaId: string, patch: Partial<Omit<ConfigCopilotoRow, 'motorista_id'>>): Promise<void> {
  const { error } = await supabase
    .from('motorista_config_copiloto')
    .upsert({ motorista_id: motoristaId, ...patch }, { onConflict: 'motorista_id' });
  if (error) throw error;
}
