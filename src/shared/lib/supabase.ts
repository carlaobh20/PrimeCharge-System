import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

// Cliente único do Supabase para todo o app.
// Nenhum componente deve chamar createClient diretamente — sempre importe daqui.
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey);

// Achado da Fase 9 (Missão 5, auditoria geral): `supabase.from(x).delete().eq('id', id)` sem
// `.select()` não gera erro quando o RLS bloqueia a exclusão (ex.: `pode_excluir_veiculo` só
// permite super_admin/owner/admin) — o PostgREST só reporta "0 linhas afetadas" via `data`
// vazio, nunca via `error`. Sem checar isso, todo `delete<Entidade>()` do repo (veiculos,
// motoristas, contratos, lancamentos, manutencoes, multas, convites, metas) exibia
// "excluído com sucesso" mesmo quando nada foi apagado. Helper genérico (infraestrutura de
// acesso a dado, não regra de negócio) para não repetir a checagem 8 vezes de formas
// ligeiramente diferentes.
export function assertLinhaAfetada(data: unknown[] | null, mensagem = 'Nenhuma linha foi afetada — verifique sua permissão.') {
  if (!data || data.length === 0) throw new Error(mensagem);
}
