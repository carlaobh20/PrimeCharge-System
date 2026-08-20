// LEGAL QA ESTRUTURAL (Fase 6) — motor PURO de auditoria documental da biblioteca contratual.
// Nada aqui interpreta direito: verifica ESTRUTURA (referências, numeração, blocos, variáveis)
// e prepara o material para revisão humana. Toda decisão jurídica permanece [VALIDAR COM
// ADVOGADO]. Consumidores: gate de publicação (JuridicoTemplatesPage), Sala do Advogado
// (índice de completude), scripts/audit-juridico-fase6.ts e gerar-qa-biblioteca.ts.
import { extrairVariaveis, resolverCondicionais } from './lib';
import { CATALOGO_VARIAVEIS, variaveisSemCatalogo, type TipoVariavel } from './variaveisCatalogo';

// ---------------------------------------------------------------------------
// Variantes renderizadas: um template com blocos {{#se}}/{{#senao}} vira DOCUMENTOS diferentes
// conforme os dados. A auditoria estrutural precisa valer para TODAS as variantes — um contrato
// sem caução não pode sair com numeração furada só porque a Cláusula de caução foi descartada.
// ---------------------------------------------------------------------------

function caminhosCondicionais(corpo: string): string[] {
  const caminhos = new Set<string>();
  for (const m of corpo.matchAll(/\{\{#(?:se|senao)\s+([\w.]+)\s*\}\}/g)) caminhos.add(m[1]);
  return [...caminhos];
}

function snapshotSintetico(caminhos: string[], preenchido: boolean): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  if (!preenchido) return snap;
  for (const caminho of caminhos) {
    const partes = caminho.split('.');
    let atual = snap;
    for (let i = 0; i < partes.length - 1; i++) {
      if (typeof atual[partes[i]] !== 'object' || atual[partes[i]] === null) atual[partes[i]] = {};
      atual = atual[partes[i]] as Record<string, unknown>;
    }
    atual[partes[partes.length - 1]] = 'x';
  }
  return snap;
}

/** As duas variantes-limite do documento: todos os blocos {{#se}} ativos / todos descartados. */
export function variantesRenderizadas(corpo: string): { rotulo: string; texto: string }[] {
  const caminhos = caminhosCondicionais(corpo);
  if (caminhos.length === 0) return [{ rotulo: 'única', texto: corpo }];
  return [
    { rotulo: 'todos os blocos ativos', texto: resolverCondicionais(corpo, snapshotSintetico(caminhos, true)) },
    { rotulo: 'todos os blocos descartados', texto: resolverCondicionais(corpo, snapshotSintetico(caminhos, false)) },
  ];
}

// ---------------------------------------------------------------------------
// Problemas estruturais
// ---------------------------------------------------------------------------

export type ProblemaEstrutural = {
  tipo: 'referencia_quebrada' | 'numeracao' | 'bloco_condicional' | 'variavel_orfa';
  variante?: string;
  detalhe: string;
};

/** Blocos condicionais: aberturas e fechamentos pareados, sem resto após resolução. */
export function verificarBlocosCondicionais(corpo: string): ProblemaEstrutural[] {
  const problemas: ProblemaEstrutural[] = [];
  const abreSe = (corpo.match(/\{\{#se\s/g) ?? []).length;
  const fechaSe = (corpo.match(/\{\{\/se\}\}/g) ?? []).length;
  const abreSenao = (corpo.match(/\{\{#senao\s/g) ?? []).length;
  const fechaSenao = (corpo.match(/\{\{\/senao\}\}/g) ?? []).length;
  if (abreSe !== fechaSe) problemas.push({ tipo: 'bloco_condicional', detalhe: `{{#se}} abre ${abreSe}× e fecha ${fechaSe}×` });
  if (abreSenao !== fechaSenao) problemas.push({ tipo: 'bloco_condicional', detalhe: `{{#senao}} abre ${abreSenao}× e fecha ${fechaSenao}×` });
  for (const v of variantesRenderizadas(corpo)) {
    if (/\{\{[#/]/.test(v.texto)) {
      problemas.push({ tipo: 'bloco_condicional', variante: v.rotulo, detalhe: 'sobrou marcador de bloco não resolvido no documento renderizado' });
    }
  }
  return problemas;
}

/**
 * Referências cruzadas internas: "Cláusula N" citada precisa existir como título "CLÁUSULA N"
 * na MESMA variante renderizada. Documento sem cláusulas numeradas (termos) não referencia
 * cláusula por número internamente — se referenciar, é referência EXTERNA ao contrato, frágil
 * por definição, e vira problema (o termo deve citar o "Contrato de Locação" sem número).
 */
export function verificarReferenciasClausulas(corpo: string): ProblemaEstrutural[] {
  const problemas: ProblemaEstrutural[] = [];
  for (const v of variantesRenderizadas(corpo)) {
    const definidas = new Set<number>();
    for (const m of v.texto.matchAll(/^#{2,4}\s+CLÁUSULA\s+(\d+)/gim)) definidas.add(Number(m[1]));
    for (const m of v.texto.matchAll(/Cláusula\s+(\d+)/g)) {
      const n = Number(m[1]);
      if (definidas.size === 0) {
        problemas.push({ tipo: 'referencia_quebrada', variante: v.rotulo, detalhe: `referência externa por número ("Cláusula ${n}") em documento sem cláusulas numeradas — citar o Contrato sem número` });
      } else if (!definidas.has(n)) {
        problemas.push({ tipo: 'referencia_quebrada', variante: v.rotulo, detalhe: `"Cláusula ${n}" citada, mas a variante não define a CLÁUSULA ${n}` });
      }
    }
    for (const m of v.texto.matchAll(/Anexo\s+([IVX]+|\d+)\b/g)) {
      problemas.push({ tipo: 'referencia_quebrada', variante: v.rotulo, detalhe: `referência a "Anexo ${m[1]}" numerado — a biblioteca não numera anexos; usar o nome do termo` });
    }
  }
  return dedup(problemas);
}

/**
 * Numeração: títulos "CLÁUSULA N" e seções "## N." devem formar sequência 1..N sem lacuna em
 * CADA variante renderizada (bloco condicional descartado não pode furar a numeração — foi
 * exatamente o defeito encontrado no Termo de Encerramento sem caução, corrigido na Fase 6).
 */
export function verificarNumeracao(corpo: string): ProblemaEstrutural[] {
  const problemas: ProblemaEstrutural[] = [];
  for (const v of variantesRenderizadas(corpo)) {
    const clausulas = [...v.texto.matchAll(/^#{2,4}\s+CLÁUSULA\s+(\d+)/gim)].map((m) => Number(m[1]));
    const secoes = [...v.texto.matchAll(/^##\s+(\d+)\./gm)].map((m) => Number(m[1]));
    for (const [rotulo, numeros] of [['CLÁUSULA', clausulas], ['seção', secoes]] as const) {
      if (numeros.length === 0) continue;
      let esperado = 1;
      for (const n of numeros) {
        if (n !== esperado) {
          problemas.push({ tipo: 'numeracao', variante: v.rotulo, detalhe: `${rotulo} ${n} aparece onde se esperava ${esperado} (sequência: ${numeros.join(', ')})` });
          break;
        }
        esperado += 1;
      }
    }
  }
  return dedup(problemas);
}

function dedup(problemas: ProblemaEstrutural[]): ProblemaEstrutural[] {
  const vistos = new Set<string>();
  return problemas.filter((p) => {
    const chave = `${p.tipo}|${p.detalhe}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

/** Auditoria estrutural completa de um corpo de documento. */
export function auditarEstrutura(corpo: string): ProblemaEstrutural[] {
  const orfas = variaveisSemCatalogo(extrairVariaveis(corpo)).map<ProblemaEstrutural>((v) => ({
    tipo: 'variavel_orfa',
    detalhe: `variável {{${v}}} fora do catálogo (sem origem no sistema)`,
  }));
  return [...orfas, ...verificarBlocosCondicionais(corpo), ...verificarReferenciasClausulas(corpo), ...verificarNumeracao(corpo)];
}

// ---------------------------------------------------------------------------
// GATE DE PUBLICAÇÃO (Fase 17): erro ESTRUTURAL bloqueia; pendência jurídica AVISA (não
// bloqueia publicar como minuta — mas OFICIAL continua exigindo revisão aprovada, regra que
// já vive em statusBiblioteca/ehVersaoOficial e não é duplicada aqui).
// ---------------------------------------------------------------------------

export type ResultadoGate = { bloqueios: string[]; avisos: string[] };

export function avaliarPublicacao(corpo: string): ResultadoGate {
  const problemas = auditarEstrutura(corpo);
  const bloqueios = problemas.map((p) => `${p.tipo === 'variavel_orfa' ? 'Variável órfã' : p.tipo === 'referencia_quebrada' ? 'Referência quebrada' : p.tipo === 'numeracao' ? 'Numeração' : 'Bloco condicional'}${p.variante ? ` (variante: ${p.variante})` : ''}: ${p.detalhe}`);
  const avisos: string[] = [];
  const pendencias = (corpo.match(/\[(?:VALIDAR COM ADVOGADO|DECISÃO DO ADVOGADO)/g) ?? []).length;
  if (pendencias > 0) {
    avisos.push(`Existem ${pendencias} decisões jurídicas pendentes no texto — publicável como MINUTA; OFICIAL exige revisão jurídica aprovada registrada.`);
  }
  return { bloqueios, avisos };
}

// ---------------------------------------------------------------------------
// Catálogo de variáveis: exemplo compatível com o tipo declarado (Fase 6 da missão —
// "variável com tipo incompatível / exemplo inválido").
// ---------------------------------------------------------------------------

const VALIDA_EXEMPLO: Record<TipoVariavel, (ex: string) => boolean> = {
  texto: (ex) => ex.trim().length > 0,
  moeda: (ex) => /R\$\s?[\d.]+,\d{2}/.test(ex),
  data: (ex) => /\d{2}\/\d{2}\/\d{4}/.test(ex),
  numero: (ex) => /^[\d.,]+$/.test(ex.trim()),
  documento: (ex) => ex.trim().length >= 3,
  lista: (ex) => ex.trim().length > 0,
};

export function validarCatalogo(): string[] {
  const problemas: string[] = [];
  for (const [nome, v] of Object.entries(CATALOGO_VARIAVEIS)) {
    if (!v.origem.trim()) problemas.push(`${nome}: sem origem`);
    if (!v.descricao.trim()) problemas.push(`${nome}: sem descrição`);
    if (v.exemplo !== '—' && !VALIDA_EXEMPLO[v.tipo](v.exemplo)) problemas.push(`${nome}: exemplo "${v.exemplo}" incompatível com o tipo ${v.tipo}`);
  }
  return problemas;
}

// ---------------------------------------------------------------------------
// VOCABULÁRIO (Fase 4 da missão): detectar termos potencialmente equivalentes usados em
// documentos diferentes. NÃO substitui nada — gera o alerta para padronização pelo advogado.
// ---------------------------------------------------------------------------

export type GrupoVocabulario = { conceito: string; termos: string[] };

export const GRUPOS_VOCABULARIO: GrupoVocabulario[] = [
  { conceito: 'A locadora (empresa)', termos: ['LOCADORA', 'PRIMECHARGE', 'CONTRATANTE'] },
  { conceito: 'O motorista (parte que loca)', termos: ['LOCATÁRIO', 'MOTORISTA', 'CONDUTOR', 'COMUNICANTE', 'DECLARANTE', 'TITULAR'] },
  { conceito: 'O bem locado', termos: ['VEÍCULO', 'AUTOMÓVEL', 'CARRO'] },
  { conceito: 'Garantia em dinheiro', termos: ['CAUÇÃO', 'DEPÓSITO CAUÇÃO', 'GARANTIA'] },
  { conceito: 'Dano ao veículo', termos: ['AVARIA', 'DANO'] },
  { conceito: 'Fim do contrato', termos: ['RESCISÃO', 'RESILIÇÃO', 'RESOLUÇÃO', 'ENCERRAMENTO'] },
  { conceito: 'Monitoramento do veículo', termos: ['RASTREAMENTO', 'TELEMETRIA', 'MONITORAMENTO'] },
];

export type UsoVocabulario = { conceito: string; usos: { termo: string; documentos: string[] }[] };

export function mapearVocabulario(docs: { nome: string; corpo: string }[]): UsoVocabulario[] {
  // remove tokens {{...}} antes de varrer — "motorista" dentro de {{motorista.nome}} é nome de
  // variável do sistema, não vocabulário jurídico do texto.
  const semVariaveis = docs.map((d) => ({ nome: d.nome, corpo: d.corpo.replace(/\{\{[^}]*\}\}/g, ' ') }));
  return GRUPOS_VOCABULARIO.map((g) => ({
    conceito: g.conceito,
    usos: g.termos
      .map((termo) => ({
        termo,
        documentos: semVariaveis
          .filter((d) => new RegExp(`(?<![A-ZÀ-Üa-zà-ü])${termo.replace(/ /g, '\\s+')}(?![A-ZÀ-Üa-zà-ü])`, 'i').test(d.corpo))
          .map((d) => d.nome),
      }))
      .filter((u) => u.documentos.length > 0),
  })).filter((g) => g.usos.length > 0);
}

// ---------------------------------------------------------------------------
// AUDITORIA CRUZADA MASTER × TERMOS (Fase 7/15): depois que o Master muda (retorno/publicação),
// conferir se os termos não ficaram órfãos de conceito ou citados sem peça. NUNCA corrige —
// devolve alertas para revisão humana.
// ---------------------------------------------------------------------------

export type AlertaCruzado = { tipo: 'conceito_ausente_no_master' | 'peca_citada_sem_template'; detalhe: string };

const CONCEITOS_CRUZADOS = ['caução', 'seguro', 'franquia', 'telemetria', 'rastreamento', 'quilometragem', 'multa', 'vistoria', 'sinistro', 'rescisão'];

/** Peças que o Master cita nominalmente → precisa existir um termo com esse nome na biblioteca. */
const PECAS_CITADAS: { citacao: RegExp; nomeContem: string }[] = [
  { citacao: /Termo de Entrega/i, nomeContem: 'Entrega' },
  { citacao: /Termos? de Entrega e de Devolução|Termo de Devolução/i, nomeContem: 'Devolução' },
  { citacao: /Termo de Ciência do Seguro/i, nomeContem: 'Seguro' },
  { citacao: /Termo de Ciência sobre Rastreamento/i, nomeContem: 'Rastreamento' },
  { citacao: /Termo de Ciência sobre Tratamento de Dados/i, nomeContem: 'Dados' },
  { citacao: /Comunicação de Sinistro/i, nomeContem: 'Comunicação' },
  { citacao: /Termo de Rescisão/i, nomeContem: 'Rescisão' },
  { citacao: /Termo de Encerramento/i, nomeContem: 'Encerramento' },
  { citacao: /termo de renovação/i, nomeContem: 'Renovação' },
];

export function auditoriaCruzada(masterCorpo: string, termos: { nome: string; corpo: string }[]): AlertaCruzado[] {
  const alertas: AlertaCruzado[] = [];
  const semVars = (t: string) => t.replace(/\{\{[^}]*\}\}/g, ' ');
  // nomes comparados sem acento e sem separadores — vale para nome de template E nome de arquivo
  const chaveNome = (t: string) =>
    t.normalize('NFD').replace(/\p{M}/gu, '').replace(/[-_]/g, ' ').toLowerCase();
  const masterLimpo = semVars(masterCorpo);
  for (const conceito of CONCEITOS_CRUZADOS) {
    const re = new RegExp(conceito, 'i');
    const termosComConceito = termos.filter((t) => re.test(semVars(t.corpo))).map((t) => t.nome);
    if (termosComConceito.length > 0 && !re.test(masterLimpo)) {
      alertas.push({
        tipo: 'conceito_ausente_no_master',
        detalhe: `"${conceito}" aparece em ${termosComConceito.length} termo(s) (${termosComConceito.slice(0, 3).join('; ')}${termosComConceito.length > 3 ? '…' : ''}) mas não existe mais no Master — revisar com o advogado.`,
      });
    }
  }
  for (const peca of PECAS_CITADAS) {
    if (peca.citacao.test(masterLimpo) && !termos.some((t) => chaveNome(t.nome).includes(chaveNome(peca.nomeContem)))) {
      alertas.push({
        tipo: 'peca_citada_sem_template',
        detalhe: `O Master cita uma peça de "${peca.nomeContem}" mas não há template com esse nome na biblioteca.`,
      });
    }
  }
  return alertas;
}

// ---------------------------------------------------------------------------
// ÍNDICE DE COMPLETUDE DOCUMENTAL (Fase 16): métrica OPERACIONAL de organização do material.
// NÃO é score jurídico, NÃO mede "segurança jurídica" — mede se o pacote está estruturalmente
// completo para o advogado revisar.
// ---------------------------------------------------------------------------

export type IndiceCompletude = {
  coberturaPct: number;   // temas COBERTOS (parcial vale metade) / temas documentáveis
  variaveisPct: number;   // 100 quando zero órfã em toda a biblioteca
  referenciasPct: number; // documentos sem problema estrutural / total
  consistenciaPct: number; // temas sem conflito potencial aberto / temas avaliados
  pendenciasJuridicas: number;
  conflitosAbertos: number;
};

export function calcularIndiceCompletude(entrada: {
  temas: { classificacao: string }[];
  conflitosAbertos: number;
  pendenciasJuridicas: number;
  documentos: { nome: string; corpo: string }[];
}): IndiceCompletude {
  const documentaveis = entrada.temas.filter((t) => ['COBERTO', 'PARCIAL', 'AUSENTE'].includes(t.classificacao));
  const pontos = documentaveis.reduce((acc, t) => acc + (t.classificacao === 'COBERTO' ? 1 : t.classificacao === 'PARCIAL' ? 0.5 : 0), 0);
  const totalOrfas = entrada.documentos.reduce((acc, d) => acc + variaveisSemCatalogo(extrairVariaveis(d.corpo)).length, 0);
  const docsComProblema = entrada.documentos.filter((d) => auditarEstrutura(d.corpo).length > 0).length;
  const pct = (x: number) => Math.round(x * 100);
  return {
    coberturaPct: documentaveis.length > 0 ? pct(pontos / documentaveis.length) : 100,
    variaveisPct: totalOrfas === 0 ? 100 : Math.max(0, pct(1 - totalOrfas / 66)),
    referenciasPct: entrada.documentos.length > 0 ? pct(1 - docsComProblema / entrada.documentos.length) : 100,
    consistenciaPct: entrada.temas.length > 0 ? pct(1 - entrada.conflitosAbertos / entrada.temas.length) : 100,
    pendenciasJuridicas: entrada.pendenciasJuridicas,
    conflitosAbertos: entrada.conflitosAbertos,
  };
}
