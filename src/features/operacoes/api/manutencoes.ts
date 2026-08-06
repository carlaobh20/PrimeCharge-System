import { supabase } from '@/shared/lib/supabase';
import type { Manutencao } from '../types';

export type ManutencaoInput = Omit<Manutencao, 'id' | 'empresa_id' | 'criado_por' | 'criado_em' | 'atualizado_em'>;

export async function listManutencoesPorVeiculo(veiculoId: string) {
  const { data, error } = await supabase
    .from('manutencoes')
    .select('*')
    .eq('veiculo_id', veiculoId)
    .order('data_execucao', { ascending: false });
  if (error) throw error;
  return data as Manutencao[];
}

// Variante em lote — mesmo padrão de listContratosPorEmpresa, usada pelo gerador de Ações
// Operacionais "manutenção agendada vencida" (Missão 4, Fase 3) sem N+1. Só as agendadas —
// realizada/cancelada não interessa a esse gerador.
export async function listManutencoesAgendadasPorEmpresa() {
  const { data, error } = await supabase.from('manutencoes').select('*').eq('status_execucao', 'agendada');
  if (error) throw error;
  return data as Manutencao[];
}

export async function createManutencao(empresaId: string, payload: ManutencaoInput) {
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('manutencoes')
    .insert({ ...payload, empresa_id: empresaId, criado_por: authData.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Manutencao;
}

export async function deleteManutencao(id: string) {
  const { error } = await supabase.from('manutencoes').delete().eq('id', id);
  if (error) throw error;
}

// Missão 4 (Fase 3) — marca uma manutenção agendada como realizada, capturando a data real
// de execução (pode divergir da data agendada) e o custo final. O trigger
// `fn_manutencao_gera_lancamento` (migration 0012) dispara também em UPDATE, então o
// Lançamento financeiro é gerado neste momento, não na criação do agendamento.
export async function marcarManutencaoRealizada(id: string, payload: { dataExecucao: string; custo: number | null }) {
  const { data, error } = await supabase
    .from('manutencoes')
    .update({ status_execucao: 'realizada', data_execucao: payload.dataExecucao, custo: payload.custo })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Manutencao;
}
