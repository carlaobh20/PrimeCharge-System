// Mini-motor de markdown do Centro Jurídico — UM parser, DOIS serializadores (HTML pra
// pré-visualização na tela; conteúdo pdfmake pro PDF). Deliberadamente mínimo: cobre só o que a
// minuta master usa (títulos ###, parágrafos, listas -, separador ---, **negrito**, *itálico*).
// Não é um markdown completo de propósito — contrato não precisa de imagem/tabela/código, e um
// motor pequeno e auditável vale mais que uma lib genérica aqui (mesmo racional da regra dos 3).
// Puro: sem DOM, sem I/O — testável em Node (scripts/audit-juridico-fase2.ts).

export type BlocoDoc =
  | { tipo: 'titulo'; nivel: 1 | 2 | 3; texto: string }
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'item'; texto: string }
  | { tipo: 'separador' };

/** Quebra o markdown em blocos. Linhas consecutivas de texto viram UM parágrafo. */
export function parseMarkdown(md: string): BlocoDoc[] {
  const blocos: BlocoDoc[] = [];
  let paragrafo: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length > 0) {
      blocos.push({ tipo: 'paragrafo', texto: paragrafo.join(' ').trim() });
      paragrafo = [];
    }
  };

  for (const linhaCrua of md.split('\n')) {
    const linha = linhaCrua.trimEnd();
    const semEspaco = linha.trim();

    if (semEspaco === '') {
      fecharParagrafo();
      continue;
    }
    if (/^---+$/.test(semEspaco)) {
      fecharParagrafo();
      blocos.push({ tipo: 'separador' });
      continue;
    }
    const titulo = /^(#{1,3})\s+(.*)$/.exec(semEspaco);
    if (titulo) {
      fecharParagrafo();
      blocos.push({ tipo: 'titulo', nivel: titulo[1].length as 1 | 2 | 3, texto: titulo[2].trim() });
      continue;
    }
    const item = /^[-*]\s+(.*)$/.exec(semEspaco);
    if (item) {
      fecharParagrafo();
      blocos.push({ tipo: 'item', texto: item[1].trim() });
      continue;
    }
    paragrafo.push(semEspaco);
  }
  fecharParagrafo();
  return blocos;
}

/** Trechos inline: texto normal, **negrito**, *itálico*. */
export type TrechoInline = { texto: string; negrito?: boolean; italico?: boolean };

export function parseInline(texto: string): TrechoInline[] {
  const trechos: TrechoInline[] = [];
  // Backticks da minuta (`{{var}}`) são só formatação de origem — removidos do documento final.
  const limpo = texto.replace(/`/g, '');
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(limpo)) !== null) {
    if (m.index > ultimo) trechos.push({ texto: limpo.slice(ultimo, m.index) });
    if (m[2] !== undefined) trechos.push({ texto: m[2], negrito: true });
    else if (m[4] !== undefined) trechos.push({ texto: m[4], italico: true });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < limpo.length) trechos.push({ texto: limpo.slice(ultimo) });
  return trechos.length > 0 ? trechos : [{ texto: limpo }];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inlineParaHtml(texto: string): string {
  return parseInline(texto)
    .map((t) => {
      let html = escapeHtml(t.texto);
      if (t.negrito) html = `<strong>${html}</strong>`;
      if (t.italico) html = `<em>${html}</em>`;
      return html;
    })
    .join('');
}

/**
 * Markdown → HTML seguro (todo texto escapado) pra pré-visualização do documento. As classes
 * são estilizadas pelo componente (DocumentoView) via Tailwind — aqui só estrutura semântica.
 */
export function markdownParaHtml(md: string): string {
  const partes: string[] = [];
  let listaAberta = false;
  const fecharLista = () => {
    if (listaAberta) {
      partes.push('</ul>');
      listaAberta = false;
    }
  };
  for (const bloco of parseMarkdown(md)) {
    if (bloco.tipo === 'item') {
      if (!listaAberta) {
        partes.push('<ul>');
        listaAberta = true;
      }
      partes.push(`<li>${inlineParaHtml(bloco.texto)}</li>`);
      continue;
    }
    fecharLista();
    if (bloco.tipo === 'titulo') partes.push(`<h${bloco.nivel}>${inlineParaHtml(bloco.texto)}</h${bloco.nivel}>`);
    else if (bloco.tipo === 'separador') partes.push('<hr/>');
    else partes.push(`<p>${inlineParaHtml(bloco.texto)}</p>`);
  }
  fecharLista();
  return partes.join('\n');
}

// ---- Serializador pdfmake ----
// O "content" do pdfmake é uma lista de nós declarativos; estilos definidos em pdf.ts.
export type NoPdf = Record<string, unknown>;

function inlineParaPdf(texto: string): NoPdf[] {
  return parseInline(texto).map((t) => ({ text: t.texto, bold: t.negrito ?? false, italics: t.italico ?? false }));
}

export function markdownParaPdfContent(md: string): NoPdf[] {
  const content: NoPdf[] = [];
  for (const bloco of parseMarkdown(md)) {
    if (bloco.tipo === 'titulo') {
      content.push({ text: inlineParaPdf(bloco.texto), style: `titulo${bloco.nivel}` });
    } else if (bloco.tipo === 'item') {
      // itens consecutivos viram ul agrupada
      const anterior = content[content.length - 1];
      if (anterior && Array.isArray(anterior.ul)) {
        (anterior.ul as NoPdf[][]).push(inlineParaPdf(bloco.texto));
      } else {
        content.push({ ul: [inlineParaPdf(bloco.texto)], style: 'lista' });
      }
    } else if (bloco.tipo === 'separador') {
      content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 455, y2: 0, lineWidth: 0.5, lineColor: '#999999' }], margin: [0, 8, 0, 8] });
    } else {
      content.push({ text: inlineParaPdf(bloco.texto), style: 'paragrafo' });
    }
  }
  return content;
}
