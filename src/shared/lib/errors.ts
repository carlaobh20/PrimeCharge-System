// Achado de campo (2026-08-09): erro do Supabase (PostgrestError/AuthError) NÃO é instância
// de `Error` — é um objeto plano com `.message`/`.code`/`.details`/`.hint`. Qualquer lugar que
// checava só `erro instanceof Error` e caía pra `String(erro)` mostrava "[object Object]" em
// vez da mensagem real — inútil tanto pro usuário quanto pra debugar depois (ver
// CentroDeOperacoesPage.tsx e errorReporting.ts). Esta função é o único lugar que sabe extrair
// mensagem de erro do projeto — reusar em vez de reimplementar o `instanceof Error ? ... :
// String(...)` em cada tela.
export function extrairMensagemDeErro(erro: unknown): string {
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
