// EXTRAÇÃO DE TEXTO DE .DOCX (Fase 7 — importação profissional). Um .docx é um ZIP com XML;
// reusamos a fflate (já dependência do projeto para dossiê/pacote) para abrir e extrair o texto
// de word/document.xml. A conversão de títulos para markdown é HEURÍSTICA e revisável — o texto
// extraído cai no editor de importação antes de qualquer confirmação; nada é incorporado às
// cegas. PDF NÃO passa por aqui de propósito: não é fonte editável (regra da Fase 1 da missão).
import { unzipSync, strFromU8 } from 'fflate';

function decodificarEntidadesXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Extrai o texto de um .docx (bytes) parágrafo a parágrafo.
 * Heurística de estrutura (revisável na tela de importação):
 * - linha começando com "CLÁUSULA N" vira título `### CLÁUSULA N — …`;
 * - linha curta "N. Título" (sem ser subitem N.N) vira título `## N. …`.
 * Lança erro claro se o arquivo não for um .docx válido.
 */
export function extrairTextoDocx(bytes: Uint8Array): string {
  let arquivos: Record<string, Uint8Array>;
  try {
    arquivos = unzipSync(bytes);
  } catch {
    throw new Error('Arquivo não é um .docx válido (não é um pacote ZIP legível).');
  }
  const doc = arquivos['word/document.xml'];
  if (!doc) throw new Error('Arquivo .docx inválido: word/document.xml ausente.');
  const xml = strFromU8(doc);

  const paragrafos: string[] = [];
  for (const m of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const p = m[0]
      .replace(/<w:tab[^>]*\/>/g, ' ')
      .replace(/<w:br[^>]*\/>/g, '\n');
    let texto = [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((x) => decodificarEntidadesXml(x[1]))
      .join('')
      .trim();
    if (!texto) continue;
    if (/^CLÁUSULA\s+\d+/i.test(texto) && !texto.startsWith('#')) {
      texto = `### ${texto}`;
    } else if (/^\d+\.\s+\S/.test(texto) && !/^\d+\.\d+/.test(texto) && texto.length <= 90) {
      texto = `## ${texto}`;
    }
    paragrafos.push(texto);
  }
  if (paragrafos.length === 0) throw new Error('Nenhum texto encontrado no .docx.');
  return paragrafos.join('\n\n');
}
