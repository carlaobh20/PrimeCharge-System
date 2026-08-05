import { supabase } from '@/shared/lib/supabase';
import type { TimelineEvento } from '../types';

// Somente leitura pela app — a escrita é feita pelos triggers do banco (ex.: fn_timeline_veiculo).
export async function listTimeline(entidadeTipo: string, entidadeId: string) {
  const { data, error } = await supabase
    .from('timeline_eventos')
    .select('*')
    .eq('entidade_tipo', entidadeTipo)
    .eq('entidade_id', entidadeId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as TimelineEvento[];
}

// Variante em lote — ver nota em capabilities/api/arquivos.ts (listArquivosPorEntidades).
export async function listTimelinePorEntidades(entidadeTipo: string, entidadeIds: string[]) {
  if (entidadeIds.length === 0) return [];
  const { data, error } = await supabase
    .from('timeline_eventos')
    .select('*')
    .eq('entidade_tipo', entidadeTipo)
    .in('entidade_id', entidadeIds)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as TimelineEvento[];
}
