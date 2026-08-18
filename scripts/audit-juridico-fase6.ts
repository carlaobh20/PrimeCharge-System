/* eslint-disable no-console */
// Auditoria determinística da Fase 6 — Legal QA:
// A) detectores estruturais (referência quebrada, numeração furada — inclusive por variante
//    condicional —, bloco quebrado, variável órfã) em fixtures sintéticas;
// B) gate de publicação (erro estrutural bloqueia; pendência jurídica só avisa);
// C) os 17 documentos REAIS passam limpos (inclui regressão das correções da Fase 6:
//    encerramento sem caução e rescisão sem gap de numeração);
// D) vocabulário/glossário; E) matriz de cobertura; F) conflitos; G) prioridade/decisões;
// H) pacote 2.0, checklist A–O, catálogo e índice de completude.
// Rodar: npx tsx --tsconfig tsconfig.app.json scripts/audit-juridico-fase6.ts
import fs from 'node:fs';
import path from 'node:path';
import {
  auditarEstrutura,
  avaliarPublicacao,
  calcularIndiceCompletude,
  mapearVocabulario,
  validarCatalogo,
  variantesRenderizadas,
  verificarNumeracao,
  verificarReferenciasClausulas,
} from '../src/features/contracts/juridico/qa';
import {
  CONFLITOS_POTENCIAIS,
  DECISOES_OPERACIONAIS,
  DECISOES_PRODUTO,
  GLOSSARIO,
  MATRIZ_COBERTURA,
  prioridadePendencia,
} from '../src/features/contracts/juridico/qaBiblioteca';
import { extrairCorpoDaMinuta } from '../src/features/contracts/juridico/minutaLib';
import { extrairPendenciasJuridicas } from '../src/features/contracts/juridico/pendenciasMinuta';

let passes = 0;
let fails = 0;
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  console.log(`${cond ? 'PASS' : 'FALHOU'} [${caso}] ${msg}`);
}

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

// ===== A. Detectores estruturais (fixtures) =====
const REF_QUEBRADA = '### CLÁUSULA 1 — A\ntexto\n### CLÁUSULA 2 — B\nver Cláusula 9.';
check('A', verificarReferenciasClausulas(REF_QUEBRADA).some((p) => p.detalhe.includes('Cláusula 9')), 'referência a cláusula inexistente é detectada');

const GAP_SECOES = '## 1. Um\nx\n## 2. Dois\nx\n## 4. Quatro\nx';
check('A', verificarNumeracao(GAP_SECOES).length === 1, 'numeração de seções com lacuna (1,2,4) é detectada');

// regressão do defeito real: seção inteira dentro de {{#se}} furava a numeração na variante sem o bloco
const GAP_VARIANTE = '## 1. Um\nx\n{{#se a.b}}\n## 2. Dois\nx\n{{/se}}\n## 3. Três\nx';
const problemasVariante = verificarNumeracao(GAP_VARIANTE);
check('A', problemasVariante.some((p) => p.variante === 'todos os blocos descartados'), 'lacuna de numeração causada por bloco condicional descartado é detectada (defeito real da Fase 5)');

check('A', auditarEstrutura('## 1. Um\n{{#se x.y}}aberto').some((p) => p.tipo === 'bloco_condicional'), 'bloco {{#se}} sem fechamento é detectado');
check('A', auditarEstrutura('Olá {{coisa.inventada}}').some((p) => p.tipo === 'variavel_orfa'), 'variável órfã é detectada');
check('A', auditarEstrutura('## 1. Um\nx {{motorista.nome}}\n## 2. Dois\nver o Contrato de Locação.').length === 0, 'documento limpo passa sem problemas');
check('A', verificarReferenciasClausulas('Termo simples.\nConforme a Cláusula 5 do contrato.').some((p) => p.detalhe.includes('externa')), 'termo citando cláusula por número (referência externa frágil) é sinalizado');

// ===== B. Gate de publicação =====
const gateOrfa = avaliarPublicacao('Texto {{sem.origem}}.');
check('B', gateOrfa.bloqueios.length === 1 && gateOrfa.bloqueios[0].includes('órfã'), 'gate: variável órfã BLOQUEIA publicação');
const gatePendencia = avaliarPublicacao('## 1. Um\nTexto {{motorista.nome}} [VALIDAR COM ADVOGADO: prazo].');
check('B', gatePendencia.bloqueios.length === 0 && gatePendencia.avisos.length === 1, 'gate: pendência jurídica AVISA mas não bloqueia (publica como MINUTA)');
const gateLimpo = avaliarPublicacao('## 1. Um\nTexto {{motorista.nome}}.');
check('B', gateLimpo.bloqueios.length === 0 && gateLimpo.avisos.length === 0, 'gate: documento limpo passa sem bloqueio nem aviso');
check('B', avaliarPublicacao('## 1. Um\n[DECISÃO DO ADVOGADO: alcance]').avisos.length === 1, 'gate: marcação [DECISÃO DO ADVOGADO] também conta como pendência');

// ===== C. Os 17 documentos reais =====
const documentos: { nome: string; corpo: string }[] = [
  { nome: 'Contrato Master', corpo: extrairCorpoDaMinuta(fs.readFileSync(path.join(RAIZ, 'docs/juridico/contrato-master-minuta.md'), 'utf8')) },
];
const dirBib = path.join(RAIZ, 'docs/juridico/biblioteca');
for (const f of fs.readdirSync(dirBib).filter((x) => x.endsWith('.md')).sort()) {
  documentos.push({ nome: f.replace('.md', ''), corpo: fs.readFileSync(path.join(dirBib, f), 'utf8') });
}
check('C', documentos.length === 17, `17 documentos carregados (achou ${documentos.length})`);
const comProblema = documentos.filter((d) => auditarEstrutura(d.corpo).length > 0);
check('C', comProblema.length === 0, `TODOS os 17 documentos passam a auditoria estrutural (falharam: ${comProblema.map((d) => d.nome).join(', ') || 'nenhum'})`);

const master = documentos[0].corpo;
for (const v of variantesRenderizadas(master)) {
  const clausulas = [...v.texto.matchAll(/^#{2,4}\s+CLÁUSULA\s+(\d+)/gim)].map((m) => Number(m[1]));
  check('C', clausulas.length === 20 && clausulas[19] === 20, `master (${v.rotulo}): 20 cláusulas contíguas (achou ${clausulas.length})`);
}

const encerramento = documentos.find((d) => d.nome === 'termo-encerramento')!.corpo;
const semCaucao = variantesRenderizadas(encerramento).find((v) => v.rotulo === 'todos os blocos descartados')!;
const secoesEnc = [...semCaucao.texto.matchAll(/^##\s+(\d+)\./gm)].map((m) => Number(m[1]));
check('C', secoesEnc.join(',') === '1,2,3,4', `regressão Fase 6: encerramento SEM caução numera 1..4 sem furo (achou ${secoesEnc.join(',')})`);

const rescisao = documentos.find((d) => d.nome === 'termo-rescisao')!.corpo;
check('C', verificarNumeracao(rescisao).length === 0, 'regressão Fase 6: termo de rescisão sem furo de numeração em nenhuma variante');

// ===== D. Vocabulário / glossário =====
const vocab = mapearVocabulario(documentos);
const grupoMotorista = vocab.find((g) => g.conceito.includes('motorista'));
check('D', !!grupoMotorista && grupoMotorista.usos.length >= 2, 'scanner de vocabulário detecta papéis equivalentes (LOCATÁRIO/TITULAR/…) em documentos diferentes');
check('D', !grupoMotorista!.usos.some((u) => u.termo === 'MOTORISTA' && u.documentos.length > 5), 'scanner ignora nomes de variáveis {{motorista.*}} (só prosa conta)');
for (const t of ['LOCADORA', 'LOCATÁRIO', 'CAUÇÃO', 'FRANQUIA', 'TELEMETRIA', 'QUITAÇÃO']) {
  check('D', GLOSSARIO.some((g) => g.termo.includes(t)), `glossário define ${t}`);
}
check('D', GLOSSARIO.length >= 20, `glossário tem ≥20 termos (${GLOSSARIO.length})`);

// ===== E. Matriz de cobertura =====
check('E', MATRIZ_COBERTURA.length >= 55, `matriz cobre ≥55 temas da missão (${MATRIZ_COBERTURA.length})`);
const CLASSES = ['COBERTO', 'PARCIAL', 'AUSENTE', 'DECISAO_JURIDICA', 'DECISAO_PRODUTO', 'DECISAO_OPERACIONAL'];
check('E', MATRIZ_COBERTURA.every((t) => CLASSES.includes(t.classificacao)), 'toda classificação é válida');
check('E', MATRIZ_COBERTURA.filter((t) => t.classificacao === 'AUSENTE').length === 0, 'nenhum tema AUSENTE restante (lacunas documentais foram cobertas ou viram decisão)');
for (const tema of ['PARTES', 'CAUÇÃO', 'FRANQUIA', 'LGPD', 'FORO', 'ANEXOS', 'PERDA TOTAL', 'SUBLOCAÇÃO', 'PNEUS', 'CARREGADOR']) {
  check('E', MATRIZ_COBERTURA.some((t) => t.tema.includes(tema)), `tema ${tema} avaliado na matriz`);
}
check('E', MATRIZ_COBERTURA.filter((t) => t.classificacao === 'DECISAO_JURIDICA').every((t) => t.responsavelDecisao === 'advogado'), 'toda DECISÃO JURÍDICA aponta o advogado como responsável');

// ===== F. Conflitos =====
check('F', CONFLITOS_POTENCIAIS.length >= 8, `≥8 conflitos potenciais registrados (${CONFLITOS_POTENCIAIS.length})`);
check('F', CONFLITOS_POTENCIAIS.every((c) => c.documentoA && c.documentoB && c.diferenca && c.perguntaAdvogado), 'todo conflito tem documento A, documento B, diferença e pergunta ao advogado');
const c1 = CONFLITOS_POTENCIAIS.find((c) => c.tema.includes('Vencimento'));
check('F', !!c1 && c1.prioridade === 'critico' && c1.status === 'aberto', 'conflito financeiro (vencimento × periodicidade) registrado como CRÍTICO e aberto');
check('F', CONFLITOS_POTENCIAIS.some((c) => c.status === 'tratado_fase6' && !!c.tratamento), 'conflito tratado na Fase 6 registra o tratamento aplicado (renovação × valor)');

// ===== G. Prioridade operacional + decisões =====
check('G', prioridadePendencia('percentuais de multa e juros') === 'critico', 'prioridade: multa/juros → crítico');
check('G', prioridadePendencia('LGPD: base legal e retenção') === 'alto', 'prioridade: LGPD → alto');
check('G', prioridadePendencia('critério de desgaste natural') === 'medio', 'prioridade: desgaste → médio');
check('G', prioridadePendencia('alcance da confidencialidade' /* pega regra médio */) !== 'critico', 'prioridade: nada vira crítico sem assunto financeiro/responsabilidade');
check('G', DECISOES_PRODUTO.length >= 5 && DECISOES_OPERACIONAIS.length >= 4, `listas de decisões de produto (${DECISOES_PRODUTO.length}) e operacionais (${DECISOES_OPERACIONAIS.length}) preenchidas`);

// ===== H. Pacote 2.0, checklist, catálogo, completude =====
const checklist = fs.readFileSync(path.join(RAIZ, 'docs/juridico/CHECKLIST-ADVOGADO.md'), 'utf8');
const secoesChecklist = 'ABCDEFGHIJKLMNO'.split('').filter((l) => new RegExp(`^## ${l} — `, 'm').test(checklist));
check('H', secoesChecklist.length === 15, `checklist do advogado tem as 15 seções A–O (achou ${secoesChecklist.length})`);
check('H', (checklist.match(/\[ \] APROVAR/g) ?? []).length >= 40, 'checklist tem campos de decisão em ≥40 itens');

const pacoteSrc = fs.readFileSync(path.join(RAIZ, 'src/features/contracts/juridico/pages/JuridicoPacoteAdvogadoPage.tsx'), 'utf8');
const PASTAS = ['00_CAPA', '01_INSTRUCOES', '02_CONTRATO_MASTER', '03_TERMOS', '04_ADITIVOS', '05_RENOVACAO', '06_SINISTROS', '07_RESCISOES', '08_LGPD', '09_SEGURO', '10_MATRIZ_VARIAVEIS', '11_MATRIZ_COBERTURA', '12_CONFLITOS', '13_PENDENCIAS_JURIDICAS', '14_DECISOES_PRODUTO', '15_DECISOES_OPERACIONAIS', '16_HISTORICO_VERSOES', '17_GLOSSARIO', '18_CHECKLIST_ADVOGADO'];
check('H', PASTAS.every((p) => pacoteSrc.includes(p)), 'pacote 2.0 monta as 19 pastas (00_CAPA … 18_CHECKLIST_ADVOGADO)');

const bibliotecaSrc = fs.readFileSync(path.join(RAIZ, 'src/features/contracts/juridico/biblioteca.ts'), 'utf8');
for (const trava of ['seguro.apolice', 'sinistro.tipo', 'rescisao.solicitante', 'aditivo.tipo', 'rescisao.valores']) {
  check('H', bibliotecaSrc.includes(`caminho: '${trava}'`), `trava de emissão exigeDados presente para ${trava}`);
}

check('H', validarCatalogo().length === 0, 'catálogo de variáveis íntegro (origem, descrição, exemplo compatível com o tipo)');

const totalPendencias = documentos.reduce((acc, d) => acc + extrairPendenciasJuridicas(d.corpo).length, 0);
const indice = calcularIndiceCompletude({
  temas: MATRIZ_COBERTURA,
  conflitosAbertos: CONFLITOS_POTENCIAIS.filter((c) => c.status === 'aberto').length,
  pendenciasJuridicas: totalPendencias,
  documentos,
});
check('H', indice.variaveisPct === 100 && indice.referenciasPct === 100, `índice: variáveis ${indice.variaveisPct}% e referências ${indice.referenciasPct}% (esperado 100/100)`);
check('H', indice.coberturaPct >= 80 && indice.coberturaPct <= 100, `índice de cobertura documental plausível (${indice.coberturaPct}%)`);
check('H', totalPendencias >= 40, `pendências jurídicas consolidadas nos 17 documentos (${totalPendencias}) — nada foi "resolvido" pelo sistema`);

console.log(`\n${passes} PASS, ${fails} FALHOU`);
if (fails > 0) process.exit(1);
