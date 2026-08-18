// PENDÊNCIAS JURÍDICAS DA MINUTA (regra 24): as marcações [VALIDAR COM ADVOGADO] não podem
// sumir silenciosamente. Este parser puro extrai cada marcação com a cláusula/section onde vive
// e o trecho, pra UI listar como pendências de decisão jurídica. As marcações da minuta REAL
// quebram linha no meio (texto corrido justificado) — o scan é por índice no texto inteiro,
// não por linha. Cruzamento com o status da revisão jurídica acontece na UI.

export type PendenciaJuridicaMinuta = {
  ordem: number;
  secao: string; // último título (### CLÁUSULA X — ...) antes da marcação
  trecho: string; // conteúdo dentro da marcação, resumido
};

const RE_MARCACAO = /\[VALIDAR COM ADVOGADO[:\s]?([\s\S]*?)\]/g;
const RE_TITULO = /^#{1,3}\s+(.*)$/gm;

export function extrairPendenciasJuridicas(md: string): PendenciaJuridicaMinuta[] {
  // mapa de títulos: posição no texto -> título
  const titulos: { indice: number; titulo: string }[] = [];
  let t: RegExpExecArray | null;
  RE_TITULO.lastIndex = 0;
  while ((t = RE_TITULO.exec(md)) !== null) {
    titulos.push({ indice: t.index, titulo: t[1].trim() });
  }
  const secaoEm = (indice: number): string => {
    let atual = 'Início do documento';
    for (const { indice: i, titulo } of titulos) {
      if (i > indice) break;
      atual = titulo;
    }
    return atual;
  };

  const pendencias: PendenciaJuridicaMinuta[] = [];
  let m: RegExpExecArray | null;
  let ordem = 0;
  RE_MARCACAO.lastIndex = 0;
  while ((m = RE_MARCACAO.exec(md)) !== null) {
    ordem += 1;
    const conteudo = (m[1] ?? '').replace(/\s+/g, ' ').trim();
    pendencias.push({
      ordem,
      secao: secaoEm(m.index),
      trecho: conteudo.length > 160 ? `${conteudo.slice(0, 157)}…` : conteudo || '(marcação sem descrição)',
    });
  }
  return pendencias;
}
