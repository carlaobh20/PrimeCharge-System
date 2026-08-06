import { supabase } from '@/shared/lib/supabase';
import type { UserRole } from '@/shared/types/database';

export type Convite = {
  id: string;
  empresa_id: string;
  email: string;
  role: UserRole;
  token: string;
  aceito: boolean;
  criado_em: string;
  expira_em: string;
};

// Só os convites ainda em aberto (não aceitos) — um convite aceito vira uma linha em
// `usuarios`, que já aparece na lista de colegas; mostrá-lo de novo aqui seria duplicar a
// mesma informação em dois lugares da mesma tela.
export async function listConvitesPendentesPorEmpresa() {
  const { data, error } = await supabase
    .from('convites')
    .select('*')
    .eq('aceito', false)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as Convite[];
}

export async function createConvite(empresaId: string, payload: { email: string; role: UserRole }) {
  const { data, error } = await supabase
    .from('convites')
    .insert({ empresa_id: empresaId, email: payload.email, role: payload.role })
    .select()
    .single();
  if (error) throw error;
  return data as Convite;
}

export async function deleteConvite(id: string) {
  const { error } = await supabase.from('convites').delete().eq('id', id);
  if (error) throw error;
}

// Leitura pública (sem sessão) de um convite por token — via RPC, não via SELECT direto na
// tabela (ver comentário na migration 0009 sobre por que uma policy de SELECT liberada aqui
// seria uma forma de vazamento de dado entre empresas).
export async function buscarConvitePorToken(token: string) {
  const { data, error } = await supabase.rpc('buscar_convite_por_token', { p_token: token }).single();
  if (error) throw error;
  return data as { email: string; role: UserRole; empresa_nome: string; valido: boolean };
}
