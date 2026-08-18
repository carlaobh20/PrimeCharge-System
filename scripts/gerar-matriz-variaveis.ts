/* eslint-disable no-console */
// FASE AO/Fase 5 — gera docs/juridico/MATRIZ-VARIAVEIS.md a partir do CATÁLOGO ÚNICO
// (variaveisCatalogo.ts) e de TODAS as minutas reais (master + biblioteca). FALHA se qualquer
// minuta usar variável fora do catálogo (variável órfã) — a matriz nunca desatualiza em silêncio.
// Regerar: npx tsx --tsconfig tsconfig.app.json scripts/gerar-matriz-variaveis.ts
import fs from 'node:fs';
import path from 'node:path';
import { extrairCorpoDaMinuta } from '../src/features/contracts/juridico/minutaLib';
import { extrairVariaveis } from '../src/features/contracts/juridico/lib';
import { CATALOGO_VARIAVEIS } from '../src/features/contracts/juridico/variaveisCatalogo';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

// corpo do master + todas as minutas da biblioteca
const documentos = new Map<string, string>();
documentos.set(
  'Contrato Master',
  extrairCorpoDaMinuta(fs.readFileSync(path.join(RAIZ, 'docs/juridico/contrato-master-minuta.md'), 'utf8')),
);
const dirBib = path.join(RAIZ, 'docs/juridico/biblioteca');
for (const f of fs.readdirSync(dirBib).filter((x) => x.endsWith('.md')).sort()) {
  documentos.set(f.replace('.md', ''), fs.readFileSync(path.join(dirBib, f), 'utf8'));
}

// uso: variável -> documentos que a utilizam
const usoPorVariavel = new Map<string, Set<string>>();
const orfas: string[] = [];
for (const [nomeDoc, corpo] of documentos) {
  for (const v of extrairVariaveis(corpo)) {
    if (!CATALOGO_VARIAVEIS[v]) {
      orfas.push(`${nomeDoc}:${v}`);
      continue;
    }
    if (!usoPorVariavel.has(v)) usoPorVariavel.set(v, new Set());
    usoPorVariavel.get(v)!.add(nomeDoc);
  }
}

const doc: string[] = [
  '# MATRIZ DE VARIÁVEIS — Biblioteca Contratual PrimeCharge',
  '',
  '> GERADO AUTOMATICAMENTE por `scripts/gerar-matriz-variaveis.ts` a partir do catálogo único',
  '> (`variaveisCatalogo.ts`) e das minutas reais. Não editar à mão — regerar após mudanças.',
  '> O script FALHA se alguma minuta usar variável fora do catálogo.',
  '',
  `Documentos analisados: ${documentos.size} · Variáveis em uso: ${usoPorVariavel.size} · Catálogo: ${Object.keys(CATALOGO_VARIAVEIS).length}`,
  '',
  '| Variável | Origem no sistema | Tipo | Obrigatória | Exemplo | Usada em |',
  '|---|---|---|---|---|---|',
];
for (const [variavel, docs] of [...usoPorVariavel.entries()].sort()) {
  const info = CATALOGO_VARIAVEIS[variavel];
  doc.push(
    `| \`{{${variavel}}}\` | ${info.origem} | ${info.tipo} | ${info.obrigatoria ? 'Sim (bloqueia geração)' : 'Não ([SEM VALOR] visível / condicional)'} | ${info.exemplo} | ${[...docs].sort().join('; ')} |`,
  );
}
const naoUsadas = Object.keys(CATALOGO_VARIAVEIS).filter((v) => !usoPorVariavel.has(v));
if (naoUsadas.length > 0) {
  doc.push('', `Variáveis catalogadas ainda sem uso em minuta: ${naoUsadas.map((v) => `\`{{${v}}}\``).join(', ')}.`);
}
doc.push(
  '',
  'Regras: variável obrigatória sem valor BLOQUEIA a geração (validacao.ts); variável opcional',
  'sem valor sai como `[SEM VALOR: …]` VISÍVEL no documento ou é removida por bloco condicional',
  '`{{#se}}/{{#senao}}` — nunca lacuna silenciosa. Variável fora do catálogo bloqueia importação.',
  '',
);

fs.writeFileSync(path.join(RAIZ, 'docs/juridico/MATRIZ-VARIAVEIS.md'), doc.join('\n'));
console.log(`MATRIZ-VARIAVEIS.md: ${documentos.size} documentos, ${usoPorVariavel.size} variáveis em uso, ${orfas.length} órfãs.`);
if (orfas.length > 0) {
  console.error('VARIÁVEIS ÓRFÃS:', orfas.join('; '));
  process.exit(1);
}
