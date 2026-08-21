// GUARDA DE SCHEMA (correção 2026-08-20; movido para shared/lib na Fase 20 — 2ª passada,
// 2026-08-21) — o app é entregue por branch, mas as migrations são aplicadas MANUALMENTE no
// Supabase. Quando o código chega antes da migration, o PostgREST devolve "tabela não
// encontrada" e a tela morria com "Não foi possível carregar. Verifique sua conexão." —
// mensagem FALSA: a conexão está ótima, o recurso é que ainda não existe.
//
// Regra: recurso ausente NÃO é erro de rede e NÃO é lista vazia (que seria mentira: "você não
// tem nada cadastrado"). É um terceiro estado — INDISPONÍVEL — que a tela declara com todas
// as letras. As telas que não dependem do recurso continuam funcionando normalmente.
//
// Vivia em motorista-app/api/ (nasceu ali, único consumidor até a Fase 19). A Fase 20 (2ª
// passada, Módulo 28) pediu explicitamente que o lado STAFF (features/frota/api/) reusasse o
// MESMO padrão em vez de reinventar um check ad-hoc de código PostgREST — então o arquivo
// mudou de casa para `shared/lib`, que é neutro entre os dois apps. Zero dependência de
// React/Supabase/DOM aqui: só interpreta o shape do erro, então mover não muda comportamento
// nenhum, só quem pode importar.

/** Erros de schema do PostgREST/Postgres: tabela/coluna inexistente. */
export function ehRecursoAusente(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'PGRST205' // tabela fora do schema cache
    || code === 'PGRST204'   // coluna fora do schema cache
    || code === '42P01'      // undefined_table
    || code === '42703';     // undefined_column
}

/** Marca módulos cujo schema ainda não existe neste ambiente (para a UI ser honesta). */
const ausentes = new Set<string>();

export function registrarAusente(modulo: string): void {
  ausentes.add(modulo);
}

export function moduloIndisponivel(modulo: string): boolean {
  return ausentes.has(modulo);
}

/**
 * Executa a leitura e, se o schema do módulo ainda não existir, devolve `vazio` em vez de
 * explodir — registrando o módulo como indisponível para a tela poder avisar. Qualquer outro
 * erro (rede, RLS, permissão) continua subindo normalmente: não engolimos falha de verdade.
 */
export async function lerTolerante<T>(modulo: string, fn: () => Promise<T>, vazio: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (ehRecursoAusente(error)) {
      registrarAusente(modulo);
      return vazio;
    }
    throw error;
  }
}
