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
