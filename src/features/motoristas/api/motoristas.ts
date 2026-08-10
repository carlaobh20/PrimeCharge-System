import { supabase, assertLinhaAfetada } from '@/shared/lib/supabase';
import type { Motorista, MotoristaStatus } from '../types';

export async function listMotoristas(filters?: { status?: MotoristaStatus | 'todos'; busca?: string }) {
  let query = supabase.from('motoristas').select('*').order('criado_em', { ascending: false });

  if (filters?.status && filters.status !== 'todos') {
    query = query.eq('status', filters.status);
  }
  if (filters?.busca) {
    const termo = filters.busca.trim();
    if (termo) {
      query = query.or(`nome_completo.ilike.%${termo}%,cpf.ilike.%${termo}%,email.ilike.%${termo}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Motorista[];
}

export async function getMotorista(id: string) {
  const { data, error } = await supabase.from('motoristas').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Motorista;
}

// `etapa_funil_desde` fica fora do Input — é mantido só por trigger (fn_motorista_etapa_funil,
// migration 0025), a aplicação nunca escreve nele diretamente (mesmo raciocínio de
// criado_em/atualizado_em).
export type MotoristaInput = Omit<Motorista, 'id' | 'empresa_id' | 'criado_em' | 'atualizado_em' | 'etapa_funil_desde'>;

export async function createMotorista(empresaId: string, payload: MotoristaInput) {
  const { data, error } = await supabase
    .from('motoristas')
    .insert({ ...payload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;
  return data as Motorista;
}

export async function updateMotorista(id: string, payload: Partial<MotoristaInput>) {
  const { data, error } = await supabase.from('motoristas').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as Motorista;
}

export async function updateMotoristaStatus(id: string, status: MotoristaStatus) {
  const { data, error } = await supabase.from('motoristas').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data as Motorista;
}

export async function deleteMotorista(id: string) {
  const { data, error } = await supabase.from('motoristas').delete().eq('id', id).select('id');
  if (error) throw error;
  assertLinhaAfetada(data);
}
