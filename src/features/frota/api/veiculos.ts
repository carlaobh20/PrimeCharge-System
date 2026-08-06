import { supabase } from '@/shared/lib/supabase';
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
  const { error } = await supabase.from('veiculos').delete().eq('id', id);
  if (error) throw error;
}

// Missão 4 (Fase 1, achado #17 da auditoria de jornada — fecha DEC-044): "Vender veículo"
// era só uma transição de status sem nenhum dado da venda em si (sem comprador, valor, data).
// Diferente de Contrato, a State Machine de Veículo não tem trigger de validação no banco
// (só client-side, VEICULO_STATUS_TRANSITIONS) — mesma lacuna real de sempre, não nova desta
// função; a validação de "só pode chegar em 'venda' a partir de 'disponivel'" continua
// acontecendo na UI (VeiculoDetailPage), igual já acontecia antes desta mudança.
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
