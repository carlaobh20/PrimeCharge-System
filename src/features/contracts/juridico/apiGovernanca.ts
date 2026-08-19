// GOVERNANÇA (Fase 8) — queries de apoio do Dashboard. Todas derivadas de tabelas EXISTENTES
// (RLS staff em tudo); nenhuma tabela/coluna nova. Payloads controlados: snapshot só das versões
// vigentes/assinadas (divergência em lote) e meta jsonb para distribuição de versões do master.
import { supabase } from '@/shared/lib/supabase';

export type VersaoVigenteLote = {
  id: string;
  contrato_id: string;
  template_id: string | null;
  status: string;
  hash_sha256: string | null;
  snapshot: Record<string, unknown> | null;
};

/** Snapshot das versões VIGENTES/ASSINADAS (uma por contrato, a mais recente) — divergência em lote. */
export async function listVersoesVigentesComSnapshot(): Promise<VersaoVigenteLote[]> {
  const { data, error } = await supabase
    .from('contrato_versoes')
    .select('id, contrato_id, template_id, status, hash_sha256, snapshot, numero')
    .in('status', ['vigente', 'assinada'])
    .order('numero', { ascending: false });
  if (error) throw error;
  const vistos = new Set<string>();
  const out: VersaoVigenteLote[] = [];
  for (const v of data as (VersaoVigenteLote & { numero: number })[]) {
    if (vistos.has(v.contrato_id)) continue;
    vistos.add(v.contrato_id);
    out.push(v);
  }
  return out;
}

/** Distribuição de versões do master em uso (Módulo 21): meta leve de TODAS as versões. */
export async function listMetaVersoesPorTemplate(): Promise<{ template_id: string | null; versao_meta: number | null }[]> {
  const { data, error } = await supabase
    .from('contrato_versoes')
    .select('template_id, versao_meta:snapshot->_meta->template_versao');
  if (error) throw error;
  return data as { template_id: string | null; versao_meta: number | null }[];
}

/** CNH dos motoristas (agenda) — colunas mínimas; RLS staff-only (0036). */
export async function listMotoristasCnh(): Promise<{ id: string; nome_completo: string; cnh_validade: string | null }[]> {
  const { data, error } = await supabase.from('motoristas').select('id, nome_completo, cnh_validade');
  if (error) throw error;
  return data as { id: string; nome_completo: string; cnh_validade: string | null }[];
}

/** Registros órfãos (Módulo 19) — os DOIS casos que o schema permite (FKs cobrem o resto):
 * versão de documento cujo template foi removido (on delete set null) e arquivo polimórfico de
 * contrato apontando para contrato inexistente. Nunca removidos automaticamente. */
export async function contarOrfaos(contratoIdsExistentes: string[]) {
  const [versoesSemTemplate, arquivosContrato] = await Promise.all([
    supabase.from('contrato_versoes').select('id', { count: 'exact', head: true }).is('template_id', null),
    supabase.from('arquivos').select('entidade_id').eq('entidade_tipo', 'contrato'),
  ]);
  if (versoesSemTemplate.error) throw versoesSemTemplate.error;
  if (arquivosContrato.error) throw arquivosContrato.error;
  const existentes = new Set(contratoIdsExistentes);
  const arquivosOrfaos = (arquivosContrato.data as { entidade_id: string }[]).filter((a) => !existentes.has(a.entidade_id)).length;
  return [
    { tipo: 'Versão de documento sem template de origem (template removido)', quantidade: versoesSemTemplate.count ?? 0 },
    { tipo: 'Arquivo de contrato sem contrato correspondente', quantidade: arquivosOrfaos },
  ];
}
