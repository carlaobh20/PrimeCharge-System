import { supabase } from '@/shared/lib/supabase';
import type { Sinistro, SinistroComRelacoes } from '../types';

// API de Sinistros (staff). NÃO cria backend novo: consome a tabela `sinistros` (0023/0031) com a
// RLS staff-only já existente (0036: select = empresa + eh_staff; insert = pode('operacoes','criar')).
// A tabela é mínima (sem valor/seguradora/status) — refletimos exatamente as colunas que existem.

const SELECT_COM_RELACOES = '*, veiculo:veiculos(id, placa), motorista:motoristas(id, nome_completo)';

export type SinistroInput = Omit<Sinistro, 'id' | 'empresa_id' | 'criado_em' | 'atualizado_em'>;

export async function listSinistrosPorVeiculo(veiculoId: string) {
  const { data, error } = await supabase
    .from('sinistros')
    .select('*')
    .eq('veiculo_id', veiculoId)
    .order('data_ocorrencia', { ascending: false });
  if (error) throw error;
  return data as Sinistro[];
}

// Leitura em lote (mesmo padrão de listMultasPorEmpresa) — disponível para futuros geradores de
// Ações Operacionais / Central de Operações, sem N+1. Hoje só a leitura por veículo é consumida.
export async function listSinistrosPorEmpresa() {
  const { data, error } = await supabase.from('sinistros').select(SELECT_COM_RELACOES).order('data_ocorrencia', { ascending: false });
  if (error) throw error;
  return data as unknown as SinistroComRelacoes[];
}

export async function createSinistro(empresaId: string, payload: SinistroInput) {
  const { data, error } = await supabase
    .from('sinistros')
    .insert({ ...payload, empresa_id: empresaId })
    .select()
    .single();
  if (error) throw error;
  return data as Sinistro;
}
