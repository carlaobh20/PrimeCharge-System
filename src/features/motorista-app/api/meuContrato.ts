import { supabase } from '@/shared/lib/supabase';
import type { Contrato } from '@/features/contracts/types';
import type { VeiculoComRelacoes } from '@/features/frota/types';

// Épico 11 — App do Motorista, Fase 1. Nenhum filtro `.eq('motorista_id', ...)` aqui de
// propósito: a migration 0034 já garante, via RLS ("contratos: motorista ve os proprios"),
// que um usuário role='motorista' só recebe as próprias linhas — mesmo padrão do resto do
// projeto (RLS é a barreira real, filtro client-side seria redundante, ver listVeiculos).
export type MeuContrato = Contrato & { veiculo: VeiculoComRelacoes };

export async function listMeusContratos(): Promise<MeuContrato[]> {
  const { data, error } = await supabase
    .from('contratos')
    .select('*, veiculo:veiculos(*, marca:marcas(*), modelo:modelos(*))')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as unknown as MeuContrato[];
}
