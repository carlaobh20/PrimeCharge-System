// Comparação de versões — puro, testável. Duas visões:
// 1. diffCondicoes: compara os campos do SNAPSHOT (valor, prazo, veículo...) — "o que mudou".
// 2. diffLinhas: diff textual linha a linha (LCS) dos corpos — visão documento.

export type MudancaCondicao = { campo: string; antes: string; depois: string };

function achatar(obj: Record<string, unknown>, prefixo = ''): Record<string, string> {
  const plano: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(obj ?? {})) {
    const caminho = prefixo ? `${prefixo}.${chave}` : chave;
    if (valor !== null && typeof valor === 'object' && !Array.isArray(valor)) {
      Object.assign(plano, achatar(valor as Record<string, unknown>, caminho));
    } else {
      plano[caminho] = valor === null || valor === undefined ? '' : String(valor);
    }
  }
  return plano;
}

/** Campos do snapshot que mudaram entre duas versões (a → b). */
export function diffCondicoes(
  snapshotA: Record<string, unknown>,
  snapshotB: Record<string, unknown>,
): MudancaCondicao[] {
  const a = achatar(snapshotA);
  const b = achatar(snapshotB);
  const campos = new Set([...Object.keys(a), ...Object.keys(b)]);
  const mudancas: MudancaCondicao[] = [];
  for (const campo of [...campos].sort()) {
    const antes = a[campo] ?? '';
    const depois = b[campo] ?? '';
    if (antes !== depois) mudancas.push({ campo, antes, depois });
  }
  return mudancas;
}

export type LinhaDiff = { tipo: 'igual' | 'removida' | 'adicionada'; texto: string };

/** Diff textual linha a linha via LCS clássico. O(n·m) — corpo de contrato tem centenas de
 * linhas, não milhões; simplicidade auditável > otimização aqui. */
export function diffLinhas(textoA: string, textoB: string): LinhaDiff[] {
  const a = textoA.split('\n');
  const b = textoB.split('\n');
  const n = a.length;
  const m = b.length;
  // tabela LCS
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const resultado: LinhaDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      resultado.push({ tipo: 'igual', texto: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      resultado.push({ tipo: 'removida', texto: a[i] });
      i++;
    } else {
      resultado.push({ tipo: 'adicionada', texto: b[j] });
      j++;
    }
  }
  while (i < n) resultado.push({ tipo: 'removida', texto: a[i++] });
  while (j < m) resultado.push({ tipo: 'adicionada', texto: b[j++] });
  return resultado;
}

/** Resumo: quantas linhas mudaram (pra badge "N alterações"). */
export function resumoDiff(diff: LinhaDiff[]): { removidas: number; adicionadas: number } {
  let removidas = 0;
  let adicionadas = 0;
  for (const l of diff) {
    if (l.tipo === 'removida') removidas++;
    else if (l.tipo === 'adicionada') adicionadas++;
  }
  return { removidas, adicionadas };
}
