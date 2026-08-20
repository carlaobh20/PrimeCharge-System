/* eslint-disable no-console */
// Auditoria determinística da Fase 7 — OFICINA JURÍDICA (retorno do advogado):
// A) parser de cláusulas/seções (master, termos, texto plano de .docx, subitens);
// B) comparador: adicionada/removida/alterada/movida + fallback sem estrutura;
// C) análise de impacto (variáveis ±/desconhecidas, pendências resolvidas/novas, QA);
// D) extração de .docx REAL (docx sintético montado com fflate) + heurística de títulos;
// E) versão de origem (associação só por hash idêntico; nunca assumida) + protocolo;
// F) conflitos antes×depois (detectores) + auditoria cruzada Master × Termos;
// G) zero destruição / honestidade (fonte: import volta a RASCUNHO, PDF não é editável,
//    pacote 21 pastas, caixa de retornos deriva status, RLS reusada — provada nas suítes SQL).
// Rodar: npx tsx --tsconfig tsconfig.app.json scripts/audit-juridico-fase7.ts
import fs from 'node:fs';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import {
  analisarImpacto,
  compararVersoes,
  identificarVersaoPorHash,
  montarProtocoloRecebimento,
  opcoesVersaoOrigem,
  parseDocumento,
} from '../src/features/contracts/juridico/comparador';
import { extrairTextoDocx } from '../src/features/contracts/juridico/docx';
import { auditoriaCruzada } from '../src/features/contracts/juridico/qa';
import { compararConflitosDoc } from '../src/features/contracts/juridico/qaBiblioteca';
import { statusRetornoDerivado } from '../src/features/contracts/juridico/comparador';
import { extrairCorpoDaMinuta } from '../src/features/contracts/juridico/minutaLib';

let passes = 0;
let fails = 0;
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  console.log(`${cond ? 'PASS' : 'FALHOU'} [${caso}] ${msg}`);
}

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const lerSrc = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

// ===== A. Parser =====
const MASTER = extrairCorpoDaMinuta(lerSrc('docs/juridico/contrato-master-minuta.md'));
const pm = parseDocumento(MASTER);
check('A', pm.secoes.length >= 20, `parser reconhece as cláusulas do master real (${pm.secoes.length} seções — inclui variantes condicionais)`);
check('A', pm.secoes.some((s) => s.id === '5' && /VALOR/i.test(s.titulo)), 'cláusula 5 identificada com título');
check('A', pm.secoes.find((s) => s.id === '10')!.subitens.some((x) => x.id === '10.4'), 'subitens N.N extraídos (10.4 na cláusula 10)');

const TERMO = lerSrc('docs/juridico/biblioteca/termo-encerramento.md');
const pt = parseDocumento(TERMO);
check('A', pt.secoes.length === 4 && pt.secoes[0].id === '1', `parser reconhece seções "## N." dos termos (${pt.secoes.length})`);

const PLANO = 'CLÁUSULA 1 — OBJETO\ntexto um\nCLÁUSULA 2 — PRAZO\ntexto dois';
check('A', parseDocumento(PLANO).secoes.length === 2, 'parser reconhece "CLÁUSULA N —" em texto plano (vindo de .docx)');

// ===== B. Comparador =====
const V1 = '### CLÁUSULA 1 — OBJETO\ncorpo um.\n### CLÁUSULA 2 — PRAZO\ncorpo dois.\n### CLÁUSULA 3 — FORO\ncorpo foro.';
const V2 = '### CLÁUSULA 1 — OBJETO\ncorpo um.\n### CLÁUSULA 2 — PRAZO\ncorpo dois ALTERADO.\n### CLÁUSULA 4 — FORO\ncorpo foro.\n### CLÁUSULA 5 — NOVA\ncoisa nova.';
const comp = compararVersoes(V1, V2);
check('B', comp.find((c) => c.id === '1')?.status === 'igual', 'cláusula intacta → IGUAL');
check('B', comp.find((c) => c.id === '2')?.status === 'alterada', 'cláusula com texto diferente → ALTERADA');
const movida = comp.find((c) => c.status === 'movida');
check('B', movida?.id === '4' && movida?.idAnterior === '3', 'cláusula renumerada com mesmo corpo → MOVIDA (3 → 4)');
check('B', comp.find((c) => c.id === '5')?.status === 'adicionada', 'cláusula nova → ADICIONADA');
const compRem = compararVersoes(V1, '### CLÁUSULA 1 — OBJETO\ncorpo um.\n### CLÁUSULA 2 — PRAZO\ncorpo dois.');
check('B', compRem.find((c) => c.id === '3')?.status === 'removida', 'cláusula que sumiu → REMOVIDA (nunca restaurada sozinha)');
const fallback = compararVersoes('texto solto sem numeração', 'outro texto solto');
check('B', fallback.length === 1 && fallback[0].status === 'alterada', 'documento sem seções numeradas cai no fallback de documento único');
const subA = '## 1. Um\n1.1. a\n\n1.2. b\n';
const subB = '## 1. Um\n1.1. a\n\n1.3. c\n';
const compSub = compararVersoes(subA, subB).find((c) => c.id === '1')!;
check('B', compSub.subitensAdicionados?.join() === '1.3' && compSub.subitensRemovidos?.join() === '1.2', 'diff de subitens (1.2 removido, 1.3 adicionado)');

// ===== C. Impacto =====
const I1 = '### CLÁUSULA 1 — A\nvalor {{contrato.valor_periodico}}. [VALIDAR COM ADVOGADO: multa]\n### CLÁUSULA 2 — B\nx.';
const I2 = '### CLÁUSULA 1 — A\nvalor {{contrato.valor_periodico}} e caução {{contrato.valor_caucao}}. Multa de 2%.\n### CLÁUSULA 2 — B\nx. [VALIDAR COM ADVOGADO: novo ponto]';
const imp = analisarImpacto(I1, I2);
check('C', imp.variaveis.adicionadas.join() === 'contrato.valor_caucao' && imp.variaveis.removidas.length === 0, 'variável adicionada detectada');
check('C', imp.pendencias.possivelmenteResolvidas.length === 1 && imp.pendencias.novas.length === 1, 'pendência que sumiu → possível resolvida; nova marcação → nova pendência');
const impOrfa = analisarImpacto(I1, 'x {{campo.inventado}}');
check('C', impOrfa.variaveis.desconhecidas.join() === 'campo.inventado', 'variável desconhecida (fora do catálogo) detectada');
const impRef = analisarImpacto(I1, '### CLÁUSULA 1 — A\nver Cláusula 9.');
check('C', impRef.referenciasAfetadas.length > 0, 'referência quebrada no texto novo aparece como referência afetada');
const impMaster = analisarImpacto(MASTER, MASTER);
check('C', impMaster.contagem.alteradas === 0 && impMaster.contagem.removidas === 0, 'master × master → zero mudanças (sanidade)');

// ===== D. Extração de .docx real (sintético via fflate) =====
const docXml = `<?xml version="1.0"?><w:document xmlns:w="x"><w:body>
<w:p><w:r><w:t>CLÁUSULA 1 — OBJETO</w:t></w:r></w:p>
<w:p><w:r><w:t>A LOCADORA cede o veículo &amp; acessórios.</w:t></w:r></w:p>
<w:p><w:r><w:t>1. Inventário</w:t></w:r></w:p>
<w:p><w:r><w:t>1.1. Item um da lista.</w:t></w:r></w:p>
</w:body></w:document>`;
const docxBytes = zipSync({ 'word/document.xml': strToU8(docXml), '[Content_Types].xml': strToU8('<Types/>') });
const extraido = extrairTextoDocx(docxBytes);
check('D', extraido.includes('### CLÁUSULA 1'), 'docx: "CLÁUSULA N" vira título ###');
check('D', extraido.includes('## 1. Inventário'), 'docx: seção "N. Título" curta vira título ##');
check('D', extraido.includes('1.1. Item um da lista.') && !extraido.includes('## 1.1'), 'docx: subitem N.N NÃO vira título');
check('D', extraido.includes('veículo & acessórios'), 'docx: entidades XML decodificadas');
let erroPdfLike = '';
try {
  extrairTextoDocx(strToU8('%PDF-1.7 not a zip'));
} catch (e) {
  erroPdfLike = String(e);
}
check('D', erroPdfLike.includes('.docx'), 'bytes que não são ZIP (ex.: PDF) → erro claro, nunca tratados como fonte editável');

// ===== E. Versão de origem + protocolo =====
const opcoes = opcoesVersaoOrigem(
  { versao_template: 3 },
  [{ id: 'h1', versao_template: 2, origem: 'retorno_advogado', criado_em: '2026-08-10T00:00:00Z', hash_sha256: 'hash-v2' }],
  'hash-v3',
);
check('E', opcoes.length === 2 && opcoes[0].rotulo.includes('v3'), 'opções de versão de origem: atual + fotografias');
check('E', identificarVersaoPorHash('hash-v2', opcoes)?.valor === 'h1', 'hash conhecido → associação automática');
check('E', identificarVersaoPorHash('hash-desconhecido', opcoes) === null, 'hash desconhecido → null (seleção manual OBRIGATÓRIA, nunca assumida)');
const protocolo = montarProtocoloRecebimento({
  documento: 'Contrato Master',
  versaoEnviada: 'v2',
  arquivoNome: 'Contrato_Master_v3.docx',
  hashArquivo: 'abc123',
  tamanhoBytes: 12345,
  recebidoEm: '18/08/2026 10:00',
  responsavel: 'Operação',
  origem: 'Retorno do advogado',
  status: 'Recebido — aguardando comparação',
});
for (const campo of ['Contrato Master', 'v2', 'Contrato_Master_v3.docx', 'abc123', '12345', 'Recebido', 'PROTOCOLO DE RECEBIMENTO']) {
  check('E', protocolo.includes(campo), `protocolo contém ${campo}`);
}

// status derivado da caixa de retornos
const arq = { criado_em: '2026-08-18T10:00:00Z', entidade_id: 'tpl-1' };
check('E', statusRetornoDerivado(arq, []) === 'recebido', 'retorno sem incorporação → RECEBIDO');
check(
  'E',
  statusRetornoDerivado(arq, [{ template_id: 'tpl-1', origem: 'retorno_advogado', criado_em: '2026-08-18T11:00:00Z' }]) === 'incorporado',
  'fotografia retorno_advogado posterior → INCORPORADO',
);
check(
  'E',
  statusRetornoDerivado(arq, [{ template_id: 'tpl-1', origem: 'retorno_advogado', criado_em: '2026-08-18T09:00:00Z' }]) === 'recebido',
  'fotografia ANTERIOR ao arquivo não conta (retorno novo continua RECEBIDO)',
);

// ===== F. Conflitos antes×depois + auditoria cruzada =====
const cMaster = compararConflitosDoc('contrato-master', MASTER, MASTER.replace('dia {{contrato.dia_vencimento}} de cada período', 'vencimento conforme a periodicidade contratada'));
const c1 = cMaster.find((c) => c.conflito.id === 'C1');
check('F', c1?.situacao === 'possivelmente_resolvido', 'C1 (vencimento×periodicidade): texto novo sem a assinatura → POSSIVELMENTE RESOLVIDO (confirmação humana)');
const cIgual = compararConflitosDoc('contrato-master', MASTER, MASTER);
check('F', cIgual.find((c) => c.conflito.id === 'C1')?.situacao === 'continua', 'C1 sem mudança → CONTINUA');
const cNovo = compararConflitosDoc('contrato-master', MASTER.replace('Resumo das condições comerciais', 'X'), MASTER);
check('F', cNovo.find((c) => c.conflito.id === 'C6')?.situacao === 'surgiu', 'assinatura que só existe no depois → NOVO');

const termosReais = fs
  .readdirSync(path.join(RAIZ, 'docs/juridico/biblioteca'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ nome: f, corpo: lerSrc(`docs/juridico/biblioteca/${f}`) }));
check('F', auditoriaCruzada(MASTER, termosReais).length === 0, 'auditoria cruzada Master × 16 termos REAIS: zero divergência hoje');
const masterSemTelemetria = MASTER.replace(/telemetria/gi, 'sistema').replace(/rastreamento/gi, 'sistema');
const alertas = auditoriaCruzada(masterSemTelemetria, termosReais);
check('F', alertas.some((a) => a.detalhe.includes('telemetria')), 'conceito removido do Master mas vivo nos termos → alerta (não corrige nada)');
const alertasPeca = auditoriaCruzada(MASTER, termosReais.filter((t) => !t.nome.includes('rescisao')));
check('F', alertasPeca.some((a) => a.tipo === 'peca_citada_sem_template'), 'peça citada no Master sem template correspondente → alerta');

// ===== G. Honestidade / zero destruição (asserções de fonte + reuso provado) =====
const apiBiblioteca = lerSrc('src/features/contracts/juridico/apiBiblioteca.ts');
check('G', apiBiblioteca.includes("status: 'rascunho' })"), 'importar retorno devolve o template a RASCUNHO (importar ≠ aprovado juridicamente)');
const importarSrc = lerSrc('src/features/contracts/juridico/components/ImportarRetorno.tsx');
check('G', importarSrc.includes('PDF recebido — extração de texto necessária antes de gerar nova versão.'), 'mensagem exata da missão para PDF presente');
check('G', importarSrc.includes('CRIAR NOVA VERSÃO') && importarSrc.includes('hashes.atual') && importarSrc.includes('hashes.novo'), 'confirmação mostra hash original × hash novo antes de criar versão');
check('G', importarSrc.includes('Esta remoção deve ser registrada como decisão jurídica?'), 'cláusula removida pergunta a decisão (registrar/restaurar/ignorar) — nunca restaura sozinha');
check('G', importarSrc.includes('Nova variável identificada'), 'variável nova exige ação (substituir/remover/catalogar) — nunca entra sozinha no catálogo');
check('G', !importarSrc.toLowerCase().includes('redline'), 'nome honesto: "comparação de versões", nunca "redline jurídico"');
for (const proibido of ['juridicamente seguro', 'Protegido juridicamente', 'Aprovado pelo sistema']) {
  check('G', !importarSrc.includes(proibido) && !apiBiblioteca.includes(proibido), `linguagem proibida ausente: "${proibido}"`);
}
const pacoteSrc = lerSrc('src/features/contracts/juridico/pages/JuridicoPacoteAdvogadoPage.tsx');
check('G', pacoteSrc.includes('19_COMPARACAO') && pacoteSrc.includes('20_ARQUIVOS_ORIGINAIS'), 'pacote final tem 19_COMPARACAO e 20_ARQUIVOS_ORIGINAIS');
const retornosSrc = lerSrc('src/features/contracts/juridico/apiRetornos.ts');
check('G', retornosSrc.includes("entidade_tipo', 'contrato_template'") || retornosSrc.includes("entidadeTipo: 'contrato_template'"), 'retornos reusam arquivos/storage com entidade_tipo contrato_template (RLS staff-only 0036/0039/0041 — provada nas suítes SQL)');
const templatesSrc = lerSrc('src/features/contracts/juridico/pages/JuridicoTemplatesPage.tsx');
check('G', templatesSrc.includes('NÃO altera contratos já gerados'), 'publicação avisa explicitamente que não altera contratos existentes');
// A Fase 7 não criou migration (reuso provado). Migrations >46 posteriores (ex.: 0047 da
// Minha Meta do motorista) são de OUTRAS features — o assert vira: nenhuma delas toca jurídico.
const migrations = fs.readdirSync(path.join(RAIZ, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 46);
const tocaJuridico = migrations.some((f) =>
  /contrato_template|contrato_versoes|contrato_assinaturas|juridico_/.test(fs.readFileSync(path.join(RAIZ, 'supabase/migrations', f), 'utf8')));
check('G', !tocaJuridico, `nenhuma migration nova da Fase 7 (schema jurídico congelado na 0046; posteriores não tocam jurídico)`);

console.log(`\n${passes} PASS, ${fails} FALHOU`);
if (fails > 0) process.exit(1);
