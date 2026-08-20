// OFICINA JURÍDICA (Fase 7) — COMPARADOR DE VERSÕES por cláusula/seção + análise de impacto +
// protocolo de recebimento + identificação de versão de origem. Motor PURO (sem I/O) — testado
// em scripts/audit-juridico-fase7.ts. O comparador NUNCA interpreta direito: ele responde
// "o que mudou, onde", e devolve as perguntas ao humano. Nome oficial na UI:
// "Comparação de versões" (nunca "redline jurídico").
import { extrairVariaveis } from './lib';
import { variaveisSemCatalogo } from './variaveisCatalogo';
import { extrairPendenciasJuridicas } from './pendenciasMinuta';
import { auditarEstrutura, type ProblemaEstrutural } from './qa';

// ---------------------------------------------------------------------------
// Parser de cláusulas/seções. Reconhece:
//   ### CLÁUSULA 5 — TÍTULO   (master, markdown)
//   ## 1. Título              (termos, markdown)
//   CLÁUSULA 5 — TÍTULO       (texto plano vindo de .docx)
// Subitens: linhas "5.1." / "1.2." dentro do corpo da seção.
// ---------------------------------------------------------------------------

export type SubitemSecao = { id: string; texto: string };
export type SecaoDocumento = { id: string; titulo: string; corpo: string; subitens: SubitemSecao[]; heading: string };
export type DocumentoParseado = { preambulo: string; secoes: SecaoDocumento[] };

const RE_CLAUSULA_MD = /^#{2,4}\s+CLÁUSULA\s+(\d+)\s*(?:[—–-]\s*)?(.*)$/i;
const RE_SECAO_MD = /^##\s+(\d+)\.\s*(.*)$/;
const RE_CLAUSULA_PLANA = /^CLÁUSULA\s+(\d+)\s*[—–-]\s*(.*)$/i;

export function parseDocumento(texto: string): DocumentoParseado {
  const linhas = texto.split('\n');
  const secoes: SecaoDocumento[] = [];
  let preambulo: string[] = [];
  let atual: { id: string; titulo: string; heading: string; linhas: string[] } | null = null;

  const fechar = () => {
    if (!atual) return;
    const corpo = atual.linhas.join('\n').trim();
    const subitens: SubitemSecao[] = [];
    for (const m of corpo.matchAll(/^(\d+\.\d+)\.\s+([\s\S]{0,120}?)(?=$|\n)/gm)) {
      subitens.push({ id: m[1], texto: m[2].replace(/\s+/g, ' ').trim() });
    }
    secoes.push({ id: atual.id, titulo: atual.titulo, corpo, subitens, heading: atual.heading });
    atual = null;
  };

  for (const linha of linhas) {
    const m = linha.match(RE_CLAUSULA_MD) ?? linha.match(RE_SECAO_MD) ?? linha.match(RE_CLAUSULA_PLANA);
    if (m) {
      fechar();
      atual = { id: m[1], titulo: (m[2] ?? '').trim(), heading: linha, linhas: [] };
    } else if (atual) {
      atual.linhas.push(linha);
    } else {
      preambulo.push(linha);
    }
  }
  fechar();
  return { preambulo: preambulo.join('\n').trim(), secoes };
}

// ---------------------------------------------------------------------------
// Comparação por cláusula: ADICIONADA / REMOVIDA / ALTERADA / MOVIDA / IGUAL
// ---------------------------------------------------------------------------

export type StatusSecao = 'igual' | 'alterada' | 'adicionada' | 'removida' | 'movida';

export type ComparacaoSecao = {
  status: StatusSecao;
  /** id/section na versão nova (ou na antiga, quando removida) */
  id: string;
  titulo: string;
  antes?: SecaoDocumento;
  depois?: SecaoDocumento;
  /** quando MOVIDA: de onde veio */
  idAnterior?: string;
  subitensAdicionados?: string[];
  subitensRemovidos?: string[];
};

const normalizar = (t: string) => t.replace(/\s+/g, ' ').trim();

export function compararVersoes(antesTexto: string, depoisTexto: string): ComparacaoSecao[] {
  const antes = parseDocumento(antesTexto);
  const depois = parseDocumento(depoisTexto);

  // fallback: sem estrutura reconhecível de um dos lados → compara como documento único
  if (antes.secoes.length === 0 || depois.secoes.length === 0) {
    const igual = normalizar(antesTexto) === normalizar(depoisTexto);
    return [
      {
        status: igual ? 'igual' : 'alterada',
        id: '—',
        titulo: 'Documento (sem seções numeradas reconhecíveis)',
        antes: { id: '—', titulo: '', corpo: antesTexto, subitens: [], heading: '' },
        depois: { id: '—', titulo: '', corpo: depoisTexto, subitens: [], heading: '' },
      },
    ];
  }

  // Chave composta id#ocorrência: um master com blocos condicionais tem a MESMA cláusula duas
  // vezes (variante {{#se}} e {{#senao}}) — a n-ésima ocorrência de um id casa com a n-ésima
  // do outro lado, senão master × master acusaria falsas alterações.
  const comChave = (secoes: SecaoDocumento[]) => {
    const contagem = new Map<string, number>();
    return secoes.map((s) => {
      const n = contagem.get(s.id) ?? 0;
      contagem.set(s.id, n + 1);
      return { chave: `${s.id}#${n}`, secao: s };
    });
  };
  const listaAntes = comChave(antes.secoes);
  const listaDepois = comChave(depois.secoes);
  const porIdAntes = new Map(listaAntes.map((x) => [x.chave, x.secao]));
  const chavesDepois = new Set(listaDepois.map((x) => x.chave));
  const resultado: ComparacaoSecao[] = [];
  const removidasCandidatas = listaAntes.filter((x) => !chavesDepois.has(x.chave)).map((x) => ({ ...x.secao, _chave: x.chave }));
  const consumidasComoMovida = new Set<string>();

  for (const { chave, secao: d } of listaDepois) {
    const a = porIdAntes.get(chave);
    if (a) {
      if (normalizar(a.corpo) === normalizar(d.corpo) && normalizar(a.titulo) === normalizar(d.titulo)) {
        resultado.push({ status: 'igual', id: d.id, titulo: d.titulo, antes: a, depois: d });
      } else {
        const idsAntes = new Set(a.subitens.map((s) => s.id));
        const idsDepois = new Set(d.subitens.map((s) => s.id));
        resultado.push({
          status: 'alterada',
          id: d.id,
          titulo: d.titulo,
          antes: a,
          depois: d,
          subitensAdicionados: d.subitens.filter((s) => !idsAntes.has(s.id)).map((s) => s.id),
          subitensRemovidos: a.subitens.filter((s) => !idsDepois.has(s.id)).map((s) => s.id),
        });
      }
      continue;
    }
    // id novo: conteúdo idêntico a uma seção que sumiu? → MOVIDA (renumerada)
    const movidaDe = removidasCandidatas.find(
      (r) => !consumidasComoMovida.has(r._chave) && normalizar(r.corpo) === normalizar(d.corpo),
    );
    if (movidaDe) {
      consumidasComoMovida.add(movidaDe._chave);
      resultado.push({ status: 'movida', id: d.id, titulo: d.titulo, antes: movidaDe, depois: d, idAnterior: movidaDe.id });
    } else {
      resultado.push({ status: 'adicionada', id: d.id, titulo: d.titulo, depois: d });
    }
  }
  for (const r of removidasCandidatas) {
    if (!consumidasComoMovida.has(r._chave)) {
      resultado.push({ status: 'removida', id: r.id, titulo: r.titulo, antes: r });
    }
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// ANÁLISE DE IMPACTO (Fase 11 da missão) — resumo OPERACIONAL do retorno.
// ---------------------------------------------------------------------------

export type ImpactoRetorno = {
  secoes: ComparacaoSecao[];
  contagem: { alteradas: number; adicionadas: number; removidas: number; movidas: number; iguais: number };
  variaveis: { adicionadas: string[]; removidas: string[]; desconhecidas: string[] };
  pendencias: { possivelmenteResolvidas: string[]; novas: string[]; mantidas: number };
  estruturais: { antes: number; depois: ProblemaEstrutural[] };
  referenciasAfetadas: ProblemaEstrutural[];
};

export function analisarImpacto(antesTexto: string, depoisTexto: string): ImpactoRetorno {
  const secoes = compararVersoes(antesTexto, depoisTexto);
  const contagem = {
    alteradas: secoes.filter((s) => s.status === 'alterada').length,
    adicionadas: secoes.filter((s) => s.status === 'adicionada').length,
    removidas: secoes.filter((s) => s.status === 'removida').length,
    movidas: secoes.filter((s) => s.status === 'movida').length,
    iguais: secoes.filter((s) => s.status === 'igual').length,
  };

  const varsAntes = new Set(extrairVariaveis(antesTexto));
  const varsDepois = new Set(extrairVariaveis(depoisTexto));
  const variaveis = {
    adicionadas: [...varsDepois].filter((v) => !varsAntes.has(v)),
    removidas: [...varsAntes].filter((v) => !varsDepois.has(v)),
    desconhecidas: variaveisSemCatalogo([...varsDepois]),
  };

  const pendAntes = extrairPendenciasJuridicas(antesTexto).map((p) => normalizar(p.trecho));
  const pendDepois = extrairPendenciasJuridicas(depoisTexto).map((p) => normalizar(p.trecho));
  const setDepois = new Set(pendDepois);
  const setAntes = new Set(pendAntes);
  const pendencias = {
    possivelmenteResolvidas: pendAntes.filter((p) => !setDepois.has(p)),
    novas: pendDepois.filter((p) => !setAntes.has(p)),
    mantidas: pendAntes.filter((p) => setDepois.has(p)).length,
  };

  const estruturaisDepois = auditarEstrutura(depoisTexto);
  return {
    secoes,
    contagem,
    variaveis,
    pendencias,
    estruturais: { antes: auditarEstrutura(antesTexto).length, depois: estruturaisDepois },
    referenciasAfetadas: estruturaisDepois.filter((p) => p.tipo === 'referencia_quebrada'),
  };
}

// ---------------------------------------------------------------------------
// VERSÃO DE ORIGEM (Fase 3 da missão): nunca assumir silenciosamente.
// ---------------------------------------------------------------------------

export type OpcaoVersaoOrigem = { valor: string; rotulo: string; hash: string | null };

export function opcoesVersaoOrigem(
  template: { versao_template: number },
  historico: { id: string; versao_template: number; origem: string; criado_em: string; hash_sha256: string | null }[],
  hashCorpoAtual: string | null,
): OpcaoVersaoOrigem[] {
  return [
    { valor: 'atual', rotulo: `v${template.versao_template} (redação atual)`, hash: hashCorpoAtual },
    ...historico.map((h) => ({
      valor: h.id,
      rotulo: `v${h.versao_template} — fotografia de ${h.criado_em.slice(0, 10)} (${h.origem})`,
      hash: h.hash_sha256,
    })),
  ];
}

/** Associa automaticamente SÓ quando o hash do texto recebido bate com uma versão conhecida
 * (documento devolvido sem alteração). Caso contrário devolve null → seleção manual OBRIGATÓRIA. */
export function identificarVersaoPorHash(hashTexto: string, opcoes: OpcaoVersaoOrigem[]): OpcaoVersaoOrigem | null {
  return opcoes.find((o) => o.hash && o.hash === hashTexto) ?? null;
}

// ---------------------------------------------------------------------------
// PROTOCOLO DE RECEBIMENTO (Fase 20 da missão) — arquivado automaticamente junto do arquivo.
// ---------------------------------------------------------------------------

export function montarProtocoloRecebimento(p: {
  documento: string;
  versaoEnviada: string;
  arquivoNome: string;
  hashArquivo: string;
  tamanhoBytes: number;
  recebidoEm: string;
  responsavel: string;
  origem: string;
  status: string;
}): string {
  return [
    '# PRIMECHARGE — PROTOCOLO DE RECEBIMENTO DE RETORNO JURÍDICO',
    '',
    `- **Documento:** ${p.documento}`,
    `- **Versão enviada/base:** ${p.versaoEnviada}`,
    `- **Arquivo recebido:** ${p.arquivoNome}`,
    `- **Hash SHA-256 do arquivo:** ${p.hashArquivo}`,
    `- **Tamanho:** ${p.tamanhoBytes} bytes`,
    `- **Recebido em:** ${p.recebidoEm}`,
    `- **Responsável pelo registro:** ${p.responsavel}`,
    `- **Origem:** ${p.origem}`,
    `- **Status:** ${p.status}`,
    '',
    '> O arquivo original foi arquivado sem modificação. A incorporação ao template gera uma',
    '> fotografia automática da redação anterior (histórico imutável) — nada é sobrescrito.',
    '',
  ].join('\n');
}

/** SHA-256 de bytes (arquivo recebido) — Web Crypto, funciona no browser e no Node 18+. */
export async function hashBytesSha256(bytes: Uint8Array): Promise<string> {
  const copia = new Uint8Array(bytes); // garante ArrayBuffer próprio (não SharedArrayBuffer)
  const digest = await crypto.subtle.digest('SHA-256', copia);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// STATUS DERIVADO do retorno (Fase 2 da missão — sem enum novo). Puro: arquivo × fotografias.
// ---------------------------------------------------------------------------

export type StatusRetorno = 'recebido' | 'incorporado';

export function statusRetornoDerivado(
  arquivo: { criado_em: string; entidade_id: string },
  historicoDoTemplate: { template_id: string; origem: string; criado_em: string }[],
): StatusRetorno {
  const incorporadoDepois = historicoDoTemplate.some(
    (h) => h.template_id === arquivo.entidade_id && h.origem === 'retorno_advogado' && h.criado_em >= arquivo.criado_em,
  );
  return incorporadoDepois ? 'incorporado' : 'recebido';
}

export const STATUS_RETORNO_LABEL: Record<StatusRetorno, string> = {
  recebido: 'Recebido — aguardando comparação/incorporação',
  incorporado: 'Incorporado (nova redação no template; anterior fotografada)',
};
