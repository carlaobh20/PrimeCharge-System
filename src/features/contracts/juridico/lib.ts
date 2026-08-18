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

/**
 * Substitui as variáveis {{a.b.c}} do template pelos valores do snapshot. Variável sem valor no
 * snapshot vira '[SEM VALOR: a.b.c]' — deixa o furo VISÍVEL no documento em vez de gerar um
 * contrato com lacuna silenciosa (fundamental: um contrato jurídico não pode ter buraco escondido).
 */
export function renderarCorpo(template: string, snapshot: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, caminho: string) => {
    const valor = resolverCaminho(snapshot, caminho);
    if (valor === undefined || valor === null || valor === '') return `[SEM VALOR: ${caminho}]`;
    return String(valor);
  });
}

/** Lista as variáveis {{...}} presentes num template (para preview/validação de preenchimento). */
export function extrairVariaveis(template: string): string[] {
  const encontradas = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) encontradas.add(m[1]);
  return [...encontradas];
}

/** Variáveis do template que NÃO têm valor no snapshot — bloqueia congelar um doc incompleto. */
export function variaveisFaltando(template: string, snapshot: Record<string, unknown>): string[] {
  return extrairVariaveis(template).filter((v) => {
    const valor = resolverCaminho(snapshot, v);
    return valor === undefined || valor === null || valor === '';
  });
}

/** SHA-256 do corpo congelado, em hex. Usa Web Crypto (disponível no browser e no Node 18+). */
export async function hashCorpo(corpo: string): Promise<string> {
  const bytes = new TextEncoder().encode(corpo);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
