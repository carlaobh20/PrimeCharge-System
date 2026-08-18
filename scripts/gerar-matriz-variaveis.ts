/* eslint-disable no-console */
// FASE AO — gera docs/juridico/MATRIZ-VARIAVEIS.md automaticamente a partir da minuta real:
// variável -> origem no sistema -> obrigatoriedade -> cláusulas onde aparece. Fonte única: o
// próprio corpo da minuta (extrairVariaveis) — a matriz nunca desatualiza silenciosamente
// (regerar: npx tsx --tsconfig tsconfig.app.json scripts/gerar-matriz-variaveis.ts).
import fs from 'node:fs';
import path from 'node:path';
import { extrairCorpoDaMinuta } from '../src/features/contracts/juridico/minutaLib';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const minuta = fs.readFileSync(path.join(RAIZ, 'docs/juridico/contrato-master-minuta.md'), 'utf8');
const corpo = extrairCorpoDaMinuta(minuta);

// Origem/obrigatoriedade de cada variável — espelha montarSnapshot (validacao.ts).
const ORIGEM: Record<string, { origem: string; obrigatoria: boolean; exemplo: string }> = {
  'empresa.razao_social': { origem: 'empresas.nome', obrigatoria: true, exemplo: 'PrimeCharge Locadora LTDA' },
  'empresa.cnpj': { origem: 'empresas.cnpj', obrigatoria: false, exemplo: '00.000.000/0001-00' },
  'empresa.endereco': { origem: 'empresas.endereco (0043) ou campo do wizard', obrigatoria: false, exemplo: 'Av. X, 100 — BH/MG' },
  'motorista.nome': { origem: 'motoristas.nome_completo', obrigatoria: true, exemplo: 'João da Silva' },
  'motorista.cpf': { origem: 'motoristas.cpf', obrigatoria: true, exemplo: '123.456.789-01' },
  'motorista.cnh': { origem: 'motoristas.cnh_numero + cnh_categoria', obrigatoria: true, exemplo: '99887766554 (categoria B)' },
  'motorista.endereco': { origem: 'motoristas.endereco', obrigatoria: false, exemplo: 'Rua Y, 22' },
  'veiculo.marca_modelo': { origem: 'marcas.nome + modelos.nome', obrigatoria: true, exemplo: 'BYD Dolphin' },
  'veiculo.placa': { origem: 'veiculos.placa', obrigatoria: true, exemplo: 'ABC1D23' },
  'veiculo.renavam': { origem: 'veiculos.renavam', obrigatoria: true, exemplo: '01234567890' },
  'veiculo.chassi': { origem: 'veiculos.chassi', obrigatoria: true, exemplo: '9BW…' },
  'veiculo.ano': { origem: 'veiculos.ano_fabricacao/ano_modelo', obrigatoria: true, exemplo: '2024/2025' },
  'veiculo.cor': { origem: 'veiculos.cor', obrigatoria: false, exemplo: 'Branco' },
  'contrato.valor_periodico': { origem: 'contratos.valor_periodico (formatado BRL)', obrigatoria: true, exemplo: 'R$ 1.400,00' },
  'contrato.periodicidade': { origem: 'contratos.periodicidade', obrigatoria: true, exemplo: 'semanal' },
  'contrato.dia_vencimento': { origem: 'contratos.dia_vencimento', obrigatoria: false, exemplo: '5' },
  'contrato.valor_caucao': { origem: 'contratos.valor_caucao (formatado BRL)', obrigatoria: false, exemplo: 'R$ 3.000,00' },
  'contrato.data_inicio': { origem: 'contratos.data_inicio', obrigatoria: true, exemplo: '01/09/2026' },
  'contrato.prazo': { origem: 'derivado de data_inicio/data_fim_prevista', obrigatoria: true, exemplo: 'de 01/09/2026 a 01/09/2027' },
  'contrato.km_incluso': { origem: 'wizard (condições) — decisão comercial', obrigatoria: false, exemplo: 'livre' },
  'contrato.regras_especificas': { origem: 'wizard (condições) / contratos.observacoes', obrigatoria: false, exemplo: '—' },
};

// clausulas onde cada variável aparece
const linhas = corpo.split('\n');
const usoPorVariavel = new Map<string, Set<string>>();
let secao = 'Início';
for (const linha of linhas) {
  const t = /^#{1,3}\s+(.*)$/.exec(linha.trim());
  if (t) secao = t[1].trim();
  for (const m of linha.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) {
    if (!usoPorVariavel.has(m[1])) usoPorVariavel.set(m[1], new Set());
    usoPorVariavel.get(m[1])!.add(secao);
  }
}

const doc: string[] = [
  '# MATRIZ DE VARIÁVEIS — Contrato Master',
  '',
  '> GERADO AUTOMATICAMENTE por `scripts/gerar-matriz-variaveis.ts` a partir da minuta real.',
  '> Não editar à mão — regerar após qualquer mudança na minuta.',
  '',
  '| Variável | Origem no sistema | Obrigatória | Exemplo | Usada em |',
  '|---|---|---|---|---|',
];
for (const [variavel, secoes] of [...usoPorVariavel.entries()].sort()) {
  const info = ORIGEM[variavel];
  doc.push(
    `| \`{{${variavel}}}\` | ${info?.origem ?? '⚠️ SEM ORIGEM MAPEADA'} | ${info ? (info.obrigatoria ? 'Sim (bloqueia geração)' : 'Não (sai [SEM VALOR] visível)') : '⚠️'} | ${info?.exemplo ?? '—'} | ${[...secoes].join('; ')} |`,
  );
}
const semOrigem = [...usoPorVariavel.keys()].filter((v) => !ORIGEM[v]);
doc.push('', `Total: ${usoPorVariavel.size} variáveis na minuta.`);
if (semOrigem.length > 0) doc.push('', `⚠️ VARIÁVEIS SEM ORIGEM MAPEADA: ${semOrigem.join(', ')} — corrigir antes de usar.`);
doc.push('', 'Regras: variável obrigatória sem valor BLOQUEIA a geração (validacao.ts);',
  'variável opcional sem valor sai como `[SEM VALOR: …]` VISÍVEL no documento — nunca lacuna silenciosa.', '');

fs.writeFileSync(path.join(RAIZ, 'docs/juridico/MATRIZ-VARIAVEIS.md'), doc.join('\n'));
console.log(`MATRIZ-VARIAVEIS.md gerada: ${usoPorVariavel.size} variáveis, ${semOrigem.length} sem origem.`);
if (semOrigem.length > 0) process.exit(1);
