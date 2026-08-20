// Helpers puros do Centro Jurídico: renderizar o corpo do documento (template + snapshot) e
// calcular o hash de integridade. Sem I/O — testável isoladamente. Segue a regra arquitetural:
// lógica pura fora do componente React.

/** Resolve um caminho com ponto ('motorista.nome') dentro de um objeto aninhado. */
function resolverCaminho(obj: Record<string, unknown>, caminho: string): unknown {
  return caminho.split('.').reduce<unknown>((acc, chave) => {
    if (acc && typeof acc === 'object' && chave in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[chave];
    }
    return undefined;
  }, obj);
}

function temValor(snapshot: Record<string, unknown>, caminho: string): boolean {
  const v = resolverCaminho(snapshot, caminho);
  return v !== undefined && v !== null && v !== '';
}

// ---- Blocos condicionais (Fase 5 — MASTER parametrizável) ----
// {{#se caminho}} ... {{/se}}     -> bloco entra no documento SÓ se o caminho tiver valor.
// {{#senao caminho}} ... {{/senao}} -> bloco entra SÓ se o caminho estiver vazio.
// É deliberadamente só isso (sem else encadeado, sem expressões): o suficiente pra um único
// Contrato Master cobrir com/sem caução, km controlada/livre etc. sem 8 documentos duplicados.
// Aninhamento de mesmo tipo não é suportado (não há caso de uso na biblioteca; o parser resolve
// o par mais interno primeiro por ser non-greedy, e o audit script trava template que abuse).
const RE_BLOCO_SE = /\{\{#se\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/se\}\}/g;
const RE_BLOCO_SENAO = /\{\{#senao\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/senao\}\}/g;

/** Resolve os blocos condicionais ANTES da substituição de variáveis. Exportado p/ preview. */
export function resolverCondicionais(template: string, snapshot: Record<string, unknown>): string {
  return template
    .replace(RE_BLOCO_SE, (_m, caminho: string, bloco: string) => (temValor(snapshot, caminho) ? bloco : ''))
    .replace(RE_BLOCO_SENAO, (_m, caminho: string, bloco: string) => (temValor(snapshot, caminho) ? '' : bloco));
}

/**
 * Substitui as variáveis {{a.b.c}} do template pelos valores do snapshot, depois de resolver os
 * blocos condicionais. Variável sem valor no snapshot vira '[SEM VALOR: a.b.c]' — deixa o furo
 * VISÍVEL no documento em vez de gerar um contrato com lacuna silenciosa (fundamental: um
 * contrato jurídico não pode ter buraco escondido).
 */
export function renderarCorpo(template: string, snapshot: Record<string, unknown>): string {
  return resolverCondicionais(template, snapshot).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, caminho: string) => {
    const valor = resolverCaminho(snapshot, caminho);
    if (valor === undefined || valor === null || valor === '') return `[SEM VALOR: ${caminho}]`;
    return String(valor);
  });
}

/** Lista as variáveis {{...}} presentes num template, INCLUINDO os caminhos usados em blocos
 * condicionais (para a matriz de variáveis nunca perder uma referência). */
export function extrairVariaveis(template: string): string[] {
  const encontradas = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) encontradas.add(m[1]);
  for (const m of template.matchAll(/\{\{#(?:se|senao)\s+([\w.]+)\s*\}\}/g)) encontradas.add(m[1]);
  return [...encontradas];
}

/**
 * Variáveis do template que NÃO têm valor no snapshot — bloqueia congelar um doc incompleto.
 * Os blocos condicionais são resolvidos ANTES: variável que só existe dentro de um bloco
 * descartado não conta como faltante (o bloco inteiro saiu do documento de propósito), e o
 * caminho-condição em si nunca é "faltante" (vazio é um estado válido dele).
 */
export function variaveisFaltando(template: string, snapshot: Record<string, unknown>): string[] {
  const resolvido = resolverCondicionais(template, snapshot);
  const soVariaveis = new Set<string>();
  for (const m of resolvido.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) soVariaveis.add(m[1]);
  return [...soVariaveis].filter((v) => !temValor(snapshot, v));
}

/** SHA-256 do corpo congelado, em hex. Usa Web Crypto (disponível no browser e no Node 18+). */
export async function hashCorpo(corpo: string): Promise<string> {
  const bytes = new TextEncoder().encode(corpo);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
