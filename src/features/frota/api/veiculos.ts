import { supabase, assertLinhaAfetada } from '@/shared/lib/supabase';
import type { Veiculo, VeiculoComRelacoes, VeiculoStatus } from '../types';

const SELECT_COM_RELACOES = '*, marca:marcas(*), modelo:modelos(*)';

export async function listVeiculos(filters?: { status?: VeiculoStatus | 'todos'; busca?: string }) {
  let query = supabase.from('veiculos').select(SELECT_COM_RELACOES).order('criado_em', { ascending: false });

  if (filters?.status && filters.status !== 'todos') {
    query = query.eq('status', filters.status);
  }
  if (filters?.busca) {
    const termo = filters.busca.trim();
    if (termo) {
      query = query.or(`placa.ilike.%${termo}%,chassi.ilike.%${termo}%,renavam.ilike.%${termo}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as VeiculoComRelacoes[];
}

export async function getVeiculo(id: string) {
  const { data, error } = await supabase.from('veiculos').select(SELECT_COM_RELACOES).eq('id', id).single();
  if (error) throw error;
  return data as unknown as VeiculoComRelacoes;
}

export type VeiculoInput = Omit<Veiculo, 'id' | 'empresa_id' | 'criado_em' | 'atualizado_em'>;

export async function createVeiculo(empresaId: string, payload: VeiculoInput) {
  const { data, error } = await supabase
    .from('veiculos')
    .insert({ ...payload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;
  return data as Veiculo;
}

export async function updateVeiculo(id: string, payload: Partial<VeiculoInput>) {
  const { data, error } = await supabase.from('veiculos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as Veiculo;
}

export async function updateVeiculoStatus(id: string, status: VeiculoStatus) {
  const { data, error } = await supabase.from('veiculos').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data as Veiculo;
}

export async function deleteVeiculo(id: string) {
  const { data, error } = await supabase.from('veiculos').delete().eq('id', id).select('id');
  if (error) throw error;
  assertLinhaAfetada(data);
}

// Missão 4 (Fase 1, achado #17 da auditoria de jornada — fecha DEC-044): "Vender veículo"
// era só uma transição de status sem nenhum dado da venda em si (sem comprador, valor, data).
// Correção de registro (Fase 9, DEC-106): ao contrário do que DEC-101 registrou, `veiculos`
// TEM trigger de validação de transição no banco desde a migration 0008
// (fn_validar_transicao_veiculo/trg_veiculos_valida_transicao, `before update`) — DEC-101 foi
// escrita checando só a migration 0003 e não achou a trigger, que só existe em 0008. Essa
// trigger valida `update` normalmente (incluindo esta chamada). O gap real (confirmado na Fase
// 9) é outro: a trigger só dispara em UPDATE, nunca em INSERT — um INSERT direto já pode
// nascer em qualquer status, sem passar pela state machine. Ver DEC-106.
export async function venderVeiculo(id: string, payload: { comprador: string; valorVenda: number; dataVenda: string }) {
  const { data, error } = await supabase
    .from('veiculos')
    .update({ status: 'venda', comprador: payload.comprador, valor_venda: payload.valorVenda, data_venda: payload.dataVenda })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Veiculo;
}
