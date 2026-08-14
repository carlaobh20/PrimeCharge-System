// Achado de campo (2026-08-09): erro do Supabase (PostgrestError/AuthError) NÃO é instância
// de `Error` — é um objeto plano com `.message`/`.code`/`.details`/`.hint`. Qualquer lugar que
// checava só `erro instanceof Error` e caía pra `String(erro)` mostrava "[object Object]" em
// vez da mensagem real — inútil tanto pro usuário quanto pra debugar depois (ver
// CentroDeOperacoesPage.tsx e errorReporting.ts).
//
// Nome deliberadamente diferente de `extrairMensagemDeErro` (shared/components/ui/toast.tsx,
// achado ao construir o Épico 2): aquela existe pra outro propósito — traduzir SQLSTATE do
// Postgres pra texto amigável em toast, escondendo detalhe técnico do operador de propósito.
// Esta é o oposto: MOSTRA o texto técnico cru, pra tela de erro/telemetria que serve pra
// diagnosticar, não pra notificar. Mesmo nome nas duas faria alguém importar a errada.
export function extrairMensagemTecnicaDeErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  if (erro && typeof erro === 'object') {
    const obj = erro as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.length > 0) return obj.message;
    try {
      return JSON.stringify(erro);
    } catch {
      return String(erro);
    }
  }
  return String(erro);
}
