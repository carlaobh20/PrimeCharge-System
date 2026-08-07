import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { isSimulationActive } from '@/simulation/simulationState';
import { fakeFrom } from '@/simulation/fakePostgrest';

const realSupabase = createClient(env.supabaseUrl, env.supabasePublishableKey);

// Missão 7 (Modo Simulação) — ÚNICO ponto de toda a aplicação onde "dado real" vira "dado
// simulado". Todo `features/*/api/*.ts` chama só `supabase.from(tabela)...` (auditado: 16
// arquivos, nenhum outro caminho de acesso a dado de negócio) — interceptar `.from` aqui,
// num Proxy em volta do client de verdade, significa que NENHUM desses arquivos precisa
// saber que a simulação existe. `auth`, `storage`, `rpc`, `channel` etc. continuam sempre
// reais mesmo com a simulação ligada: login, upload de arquivo e convite de usuário nunca
// devem ser afetados por estar em modo demonstração — só as tabelas de negócio (frota,
// motoristas, contratos, financeiro, operações, capabilities) são desviadas.
export const supabase = new Proxy(realSupabase, {
  get(target, prop) {
    if (prop === 'from' && isSimulationActive()) {
      return (table: string) => fakeFrom(table);
    }
    const value = Reflect.get(target, prop);
    // Método de nível raiz (from/rpc/channel/removeChannel/...) chamado como `supabase.x()`
    // roda com `this` apontando pro Proxy, não pro client real — e o supabase-js usa campos
    // privados de classe (`#campo`) internamente, que fazem *identidade* do objeto, não
    // duck typing. Sem rebind, isso quebra com "Cannot read private member from an object
    // whose class did not declare it". `.bind(target)` garante que `this` seja sempre a
    // instância real, em qualquer método, sem precisar listar cada um manualmente.
    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as typeof realSupabase;

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
