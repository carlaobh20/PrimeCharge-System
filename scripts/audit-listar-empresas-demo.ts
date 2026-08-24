/* eslint-disable no-console */
// Auditoria ESTÁTICA do PASSO 0 (scripts/listar-empresas-demo.ts) — Fase 23.
// Mesma convenção dos demais scripts/audit-*.ts: só leitura de arquivo, ZERO conexão de rede,
// zero import de '@supabase/supabase-js' neste arquivo de teste.
//
//   npx tsx scripts/audit-listar-empresas-demo.ts

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lerCredenciaisObrigatorias } from './lib/motoristaDemoShared.ts';

let passes = 0;
let fails = 0;
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  console.log(`  [${cond ? 'OK' : 'FALHA'}] ${caso}: ${msg}`);
}

const raiz = join(new URL('.', import.meta.url).pathname, '..');
const ler = (rel: string) => readFileSync(join(raiz, rel), 'utf8');
const src = ler('scripts/listar-empresas-demo.ts');
// remove comentários de linha e de bloco antes das varreduras "fora de comentário", pra não dar
// falso-negativo quando a própria explicação do script menciona a palavra (ex.: este arquivo
// de teste cita "INSERT" em texto — o alvo da varredura é sempre listar-empresas-demo.ts, nunca
// este arquivo).
const srcSemComentarios = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

// ============================================================================================
// A — Nenhuma operação de escrita no cliente Supabase
// ============================================================================================
console.log('A — proteção contra escrita (supabase-js)');
check('A1', !/\.insert\s*\(/.test(srcSemComentarios), 'nenhuma chamada .insert(');
check('A2', !/\.update\s*\(/.test(srcSemComentarios), 'nenhuma chamada .update(');
check('A3', !/\.delete\s*\(/.test(srcSemComentarios), 'nenhuma chamada .delete(');
check('A4', !/\.upsert\s*\(/.test(srcSemComentarios), 'nenhuma chamada .upsert(');
check('A5', !/\.rpc\s*\(/.test(srcSemComentarios), 'nenhuma chamada .rpc( (nenhuma função de banco é invocada, só SELECT direto)');
check('A6', !/auth\.admin/.test(srcSemComentarios), 'nenhuma chamada auth.admin.* (não cria/edita/apaga usuário nenhum)');
check('A7', /\.select\s*\(/.test(srcSemComentarios), 'usa .select( pelo menos uma vez (o script realmente lê algo)');

// ============================================================================================
// B — Nenhuma palavra-chave de SQL perigoso usada como operação (fora de comentário/string
// literal explicativa) — defesa em profundidade, mesmo não havendo nenhum SQL cru no arquivo.
// ============================================================================================
console.log('\nB — varredura de palavras-chave SQL perigosas (fora de comentários)');
// \b...\b em cada lado: "CREATE" não bate dentro de "createClient" (sem fronteira de palavra
// entre "create" e "Client", já que os dois são caracteres \w) — evita falso-positivo nas
// próprias chamadas legítimas do supabase-js (createClient) sem enfraquecer a checagem real.
const PALAVRAS_PERIGOSAS = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'DROP', 'ALTER', 'CREATE'];
for (const palavra of PALAVRAS_PERIGOSAS) {
  const regex = new RegExp(`\\b${palavra}\\b`, 'i');
  const bateu = regex.test(srcSemComentarios);
  // "CREATE" bate legitimamente em "createClient" só quando NÃO separado por fronteira de
  // palavra (não deveria bater — confirmado abaixo por B-sanity); se bater aqui, é um achado
  // real que merece revisão manual, não descartamos automaticamente.
  check(`B-${palavra}`, !bateu, `"${palavra}" não aparece como palavra isolada no código (fora de comentários)`);
}
check('B-sanity-createClient-nao-conta', !/\bcreate\b/i.test('createClient'), 'sanity: \\bcreate\\b não bate dentro de "createClient" (confirma que a checagem acima não teria falso-positivo)');

// ============================================================================================
// C — Sem segredo, sem manifesto, sem criação de usuário, sem alteração de migration/código
// ============================================================================================
console.log('\nC — segredo e efeitos colaterais');
check('C1', !/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/.test(src), 'nenhuma service role key hardcoded');
check('C2', !/console\.(log|error)\([^)]*[Ss]erviceRoleKey/.test(src), 'a service role key nunca é impressa (não referenciada em console.log/error)');
check('C3', !/writeFileSync|createWriteStream/.test(src), 'nenhuma escrita em arquivo (sem manifesto, sem log em disco)');
check('C4', !/CAMINHO_MANIFESTO/.test(src), 'não referencia o manifesto do seed — este script é independente e não grava estado');
check('C5', /lerCredenciaisObrigatorias/.test(src), 'reusa a mesma checagem de credenciais dos outros scripts (consistência, sem duplicar lógica de segurança)');

// sanity check da própria função reusada (já testada em audit-motorista-demo-scripts.ts, mas
// confirmamos aqui de novo porque este script depende diretamente dela)
check('C6', lerCredenciaisObrigatorias({}).ok === false, 'sem SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY => aborta (mesma regra dos outros scripts)');

// ============================================================================================
// D — Só lê as tabelas esperadas (empresas, motoristas, veiculos, contratos, convites, marcas,
// modelos) — nenhuma tabela fora desse conjunto, nenhuma tabela do Centro Jurídico/Frota.
// ============================================================================================
console.log('\nD — escopo de tabelas lidas');
const tabelasReferenciadas = [...srcSemComentarios.matchAll(/\.from\(['"]([a-z_]+)['"]\)/g)].map((m) => m[1]);
const TABELAS_PERMITIDAS = new Set(['empresas', 'motoristas', 'veiculos', 'contratos', 'convites', 'marcas', 'modelos']);
const foraDoEscopo = tabelasReferenciadas.filter((t) => !TABELAS_PERMITIDAS.has(t));
check('D1', tabelasReferenciadas.length > 0, `pelo menos uma tabela é lida (achei: ${[...new Set(tabelasReferenciadas)].join(', ')})`);
check('D2', foraDoEscopo.length === 0, `nenhuma tabela fora do escopo esperado é lida (fora do escopo: ${foraDoEscopo.join(', ') || 'nenhuma'})`);
check(
  'D3',
  !tabelasReferenciadas.some((t) => t.startsWith('contrato_') || t.startsWith('juridico_') || t.startsWith('frota_')),
  'nenhuma tabela do Centro Jurídico ou de Frota é tocada'
);

console.log(`\n=== RESULTADO: ${passes} OK / ${fails} FALHA${fails === 1 ? '' : 'S'} ===`);
process.exitCode = fails === 0 ? 0 : 1;
