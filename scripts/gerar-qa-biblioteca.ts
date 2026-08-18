/* eslint-disable no-console */
// FASE 6 (Legal QA) — gera docs/juridico/MATRIZ-COBERTURA.md, CONFLITOS.md e GLOSSARIO.md a
// partir da FONTE ÚNICA (qaBiblioteca.ts) + auditoria estrutural das minutas REAIS (qa.ts).
// FALHA se qualquer minuta tiver problema estrutural (referência quebrada, numeração furada,
// bloco condicional quebrado, variável órfã) — o material do advogado nunca sai desatualizado
// nem estruturalmente quebrado. Regerar: npx tsx --tsconfig tsconfig.app.json scripts/gerar-qa-biblioteca.ts
import fs from 'node:fs';
import path from 'node:path';
import { extrairCorpoDaMinuta } from '../src/features/contracts/juridico/minutaLib';
import { auditarEstrutura, calcularIndiceCompletude, mapearVocabulario, validarCatalogo } from '../src/features/contracts/juridico/qa';
import { extrairPendenciasJuridicas } from '../src/features/contracts/juridico/pendenciasMinuta';
import {
  CONFLITOS_POTENCIAIS,
  DECISOES_OPERACIONAIS,
  DECISOES_PRODUTO,
  GLOSSARIO,
  MATRIZ_COBERTURA,
  PRIORIDADE_LABEL,
} from '../src/features/contracts/juridico/qaBiblioteca';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const HOJE = '2026-08-18';

// ---- carregar as minutas reais ----
const documentos: { nome: string; corpo: string }[] = [
  { nome: 'Contrato Master', corpo: extrairCorpoDaMinuta(fs.readFileSync(path.join(RAIZ, 'docs/juridico/contrato-master-minuta.md'), 'utf8')) },
];
const dirBib = path.join(RAIZ, 'docs/juridico/biblioteca');
for (const f of fs.readdirSync(dirBib).filter((x) => x.endsWith('.md')).sort()) {
  documentos.push({ nome: f.replace('.md', ''), corpo: fs.readFileSync(path.join(dirBib, f), 'utf8') });
}

// ---- auditoria estrutural (bloqueante) ----
let falhas = 0;
for (const d of documentos) {
  for (const p of auditarEstrutura(d.corpo)) {
    console.error(`ESTRUTURA ${d.nome}: [${p.tipo}${p.variante ? ` · ${p.variante}` : ''}] ${p.detalhe}`);
    falhas += 1;
  }
}
for (const p of validarCatalogo()) {
  console.error(`CATÁLOGO: ${p}`);
  falhas += 1;
}

const totalPendencias = documentos.reduce((acc, d) => acc + extrairPendenciasJuridicas(d.corpo).length, 0);
const conflitosAbertos = CONFLITOS_POTENCIAIS.filter((c) => c.status === 'aberto').length;
const indice = calcularIndiceCompletude({
  temas: MATRIZ_COBERTURA,
  conflitosAbertos,
  pendenciasJuridicas: totalPendencias,
  documentos,
});

// ---- MATRIZ-COBERTURA.md ----
const CLASSE_LABEL: Record<string, string> = {
  COBERTO: 'COBERTO',
  PARCIAL: 'PARCIAL',
  AUSENTE: 'AUSENTE',
  DECISAO_JURIDICA: 'DECISÃO JURÍDICA',
  DECISAO_PRODUTO: 'DECISÃO DE PRODUTO',
  DECISAO_OPERACIONAL: 'DECISÃO OPERACIONAL',
};
const cob: string[] = [
  '# MATRIZ DE COBERTURA DOCUMENTAL — Biblioteca Contratual PrimeCharge',
  '',
  '> GERADO por `scripts/gerar-qa-biblioteca.ts` a partir de `qaBiblioteca.ts` (fonte única,',
  '> produzida pela leitura integral dos 17 documentos na auditoria da Fase 6). Não editar à mão.',
  '> "COBERTO" mede presença DOCUMENTAL do tema — NÃO é validação jurídica. Nenhum documento é',
  `> juridicamente validado até revisão registrada. Atualizado: ${HOJE}.`,
  '',
  `Temas avaliados: ${MATRIZ_COBERTURA.length} · Pendências jurídicas no texto: ${totalPendencias} · Conflitos potenciais abertos: ${conflitosAbertos}`,
  '',
  `Índice de completude documental (métrica operacional): cobertura ${indice.coberturaPct}% · variáveis ${indice.variaveisPct}% · referências ${indice.referenciasPct}% · consistência ${indice.consistenciaPct}%`,
  '',
  '| Tema | Classificação | Master | Termos | Política/Parâmetro | Dado do sistema | Decisão de |',
  '|---|---|---|---|---|---|---|',
];
for (const t of MATRIZ_COBERTURA) {
  cob.push(
    `| ${t.tema} | ${CLASSE_LABEL[t.classificacao]} | ${t.master ?? '—'} | ${t.termos?.join('; ') ?? '—'} | ${t.politicaParametro ?? '—'} | ${t.dadoSistema ?? '—'} | ${t.responsavelDecisao} |`,
  );
}
cob.push('', '## Observações por tema', '');
for (const t of MATRIZ_COBERTURA.filter((x) => x.observacao)) cob.push(`- **${t.tema}**: ${t.observacao}`);
cob.push('');
fs.writeFileSync(path.join(RAIZ, 'docs/juridico/MATRIZ-COBERTURA.md'), cob.join('\n'));

// ---- CONFLITOS.md ----
const conf: string[] = [
  '# CONFLITOS POTENCIAIS ENTRE DOCUMENTOS — Biblioteca Contratual PrimeCharge',
  '',
  '> GERADO por `scripts/gerar-qa-biblioteca.ts` a partir de `qaBiblioteca.ts`. O sistema NÃO',
  '> decide qual lado está correto: cada conflito traz a pergunta para o advogado. Prioridade é',
  `> ORDENAÇÃO OPERACIONAL de revisão, não análise de risco jurídico. Atualizado: ${HOJE}.`,
  '',
];
for (const c of CONFLITOS_POTENCIAIS) {
  conf.push(
    `## ${c.id} — ${c.tema} (${PRIORIDADE_LABEL[c.prioridade]} · ${c.status === 'aberto' ? 'ABERTO' : 'TRATADO NA FASE 6'})`,
    '',
    `- **Documento A:** ${c.documentoA}`,
    `- **Documento B:** ${c.documentoB}`,
    `- **Diferença:** ${c.diferenca}`,
    `- **Pergunta para o advogado:** ${c.perguntaAdvogado}`,
    ...(c.tratamento ? [`- **Tratamento aplicado:** ${c.tratamento}`] : []),
    '',
  );
}
conf.push('## Decisões de PRODUTO derivadas da auditoria', '');
for (const d of DECISOES_PRODUTO) conf.push(`- ${d}`);
conf.push('', '## Decisões OPERACIONAIS derivadas da auditoria', '');
for (const d of DECISOES_OPERACIONAIS) conf.push(`- ${d}`);
conf.push('');
fs.writeFileSync(path.join(RAIZ, 'docs/juridico/CONFLITOS.md'), conf.join('\n'));

// ---- GLOSSARIO.md ----
const vocab = mapearVocabulario(documentos);
const glo: string[] = [
  '# GLOSSÁRIO — Vocabulário da Biblioteca Contratual PrimeCharge',
  '',
  '> GERADO por `scripts/gerar-qa-biblioteca.ts` a partir de `qaBiblioteca.ts` + varredura dos',
  '> documentos reais. Sinônimos NÃO são substituídos automaticamente — os alertas abaixo vão ao',
  `> advogado para padronização. Atualizado: ${HOJE}.`,
  '',
  '| Termo | Definição operacional | Equivalências / observações |',
  '|---|---|---|',
];
for (const g of GLOSSARIO) glo.push(`| **${g.termo}** | ${g.definicao} | ${g.equivalencias ?? '—'} |`);
glo.push('', '## Alertas de vocabulário (termos potencialmente equivalentes em documentos diferentes)', '');
for (const g of vocab.filter((x) => x.usos.length > 1)) {
  glo.push(`- **${g.conceito}** aparece como: ${g.usos.map((u) => `“${u.termo}” (${u.documentos.length} doc.)`).join(', ')} — padronização a confirmar com o advogado.`);
}
glo.push('');
fs.writeFileSync(path.join(RAIZ, 'docs/juridico/GLOSSARIO.md'), glo.join('\n'));

console.log(
  `QA biblioteca: ${documentos.length} documentos auditados · ${falhas} problema(s) estrutural(is) · ` +
    `${MATRIZ_COBERTURA.length} temas · ${CONFLITOS_POTENCIAIS.length} conflitos (${conflitosAbertos} abertos) · ` +
    `${GLOSSARIO.length} termos no glossário · completude ${indice.coberturaPct}/${indice.variaveisPct}/${indice.referenciasPct}/${indice.consistenciaPct}%`,
);
if (falhas > 0) process.exit(1);
