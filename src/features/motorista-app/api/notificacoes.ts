import { supabase } from '@/shared/lib/supabase';

// Central de notificações in-app do motorista (migration 0041). Geradas por trigger no banco
// (pedido/chamado/documento/vistoria). O motorista só lê e marca como lida. NÃO é push (sem
// infra de push nesta fase — a arquitetura fica pronta pra isso depois).

export type NotificacaoTipo = 'cobranca' | 'pedido' | 'chamado' | 'documento' | 'vistoria' | 'geral';

export type Notificacao = {
  id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  lida: boolean;
  criado_em: string;
};

export async function listMinhasNotificacoes(): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from('notificacoes')
    .select('id, tipo, titulo, mensagem, link, lida, criado_em')
    .order('criado_em', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Notificacao[];
}

export async function marcarNotificacaoLida(id: string): Promise<void> {
  const { error } = await supabase.from('notificacoes').update({ lida: true, lida_em: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function marcarTodasLidas(): Promise<void> {
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida: true, lida_em: new Date().toISOString() })
    .eq('lida', false);
  if (error) throw error;
}
