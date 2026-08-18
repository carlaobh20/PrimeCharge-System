/* eslint-disable no-console */
// Auditoria determinística da Fase 5 — Biblioteca Contratual:
// A) blocos condicionais do renderer; B) toda minuta da biblioteca carrega, tem aviso MINUTA,
// variáveis 100% no catálogo (zero órfã) e condicionais balanceados; C) registry consistente
// com os arquivos; D) master renderiza variantes (com/sem caução, km) sem sobrar {{...}}.
// Rodar: npx tsx --tsconfig tsconfig.app.json scripts/audit-juridico-fase5.ts
import fs from 'node:fs';
import path from 'node:path';
import { renderarCorpo, resolverCondicionais, extrairVariaveis, variaveisFaltando } from '../src/features/contracts/juridico/lib';
import { CATALOGO_VARIAVEIS, variaveisSemCatalogo } from '../src/features/contracts/juridico/variaveisCatalogo';
import { extrairCorpoDaMinuta } from '../src/features/contracts/juridico/minutaLib';
import { montarSnapshot } from '../src/features/contracts/juridico/validacao';

let passes = 0;
let fails = 0;
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  console.log(`${cond ? 'PASS' : 'FALHOU'} [${caso}] ${msg}`);
}

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

// ===== A. Blocos condicionais =====
const T = 'A{{#se x.a}}COM_A {{x.a}}{{/se}}{{#senao x.a}}SEM_A{{/senao}}B {{x.b}}';
const comA = renderarCorpo(T, { x: { a: 'V', b: 'W' } });
check('A', comA === 'ACOM_A VB W', `#se com valor mantém o bloco (got "${comA}")`);
const semA = renderarCorpo(T, { x: { b: 'W' } });
check('A', semA === 'ASEM_AB W', `#senao com vazio mantém o alternativo (got "${semA}")`);
check('A', extrairVariaveis(T).includes('x.a') && extrairVariaveis(T).includes('x.b'), 'extrairVariaveis captura caminhos de condicionais');
check('A', variaveisFaltando(T, { x: { b: 'W' } }).length === 0, 'variável dentro de bloco descartado não conta como faltante');
check('A', variaveisFaltando(T, { x: { a: 'V' } }).join(',') === 'x.b', 'variável fora de bloco continua contando como faltante');
const multiline = renderarCorpo('{{#se y.z}}linha1\nlinha2 {{y.z}}\n{{/se}}fim', { y: { z: 'ok' } });
check('A', multiline.includes('linha2 ok'), 'blocos condicionais funcionam multiline');

// ===== B. Toda a biblioteca: arquivos, aviso, catálogo, balanceamento =====
const dirBiblioteca = path.join(RAIZ, 'docs/juridico/biblioteca');
const arquivos = fs.readdirSync(dirBiblioteca).filter((f) => f.endsWith('.md')).sort();
check('B', arquivos.length === 16, `biblioteca tem 16 minutas além do master (achou ${arquivos.length})`);

const masterMd = fs.readFileSync(path.join(RAIZ, 'docs/juridico/contrato-master-minuta.md'), 'utf8');
const corposPorArquivo = new Map<string, string>([['contrato-master-minuta.md', extrairCorpoDaMinuta(masterMd)]]);
for (const f of arquivos) corposPorArquivo.set(f, fs.readFileSync(path.join(dirBiblioteca, f), 'utf8'));

let todasComAviso = true;
let orfasTotais: string[] = [];
let desbalanceados: string[] = [];
for (const [nome, conteudo] of corposPorArquivo) {
  const fonteAviso = nome === 'contrato-master-minuta.md' ? masterMd : conteudo;
  if (!/MINUTA — SUJEITA À VALIDAÇÃO JURÍDICA/.test(fonteAviso)) {
    todasComAviso = false;
    console.log(`  -> sem aviso MINUTA: ${nome}`);
  }
  const orfas = variaveisSemCatalogo(extrairVariaveis(conteudo));
  if (orfas.length > 0) {
    orfasTotais = orfasTotais.concat(orfas.map((v) => `${nome}:${v}`));
  }
  const abreSe = (conteudo.match(/\{\{#se\s/g) ?? []).length;
  const fechaSe = (conteudo.match(/\{\{\/se\}\}/g) ?? []).length;
  const abreSenao = (conteudo.match(/\{\{#senao\s/g) ?? []).length;
  const fechaSenao = (conteudo.match(/\{\{\/senao\}\}/g) ?? []).length;
  if (abreSe !== fechaSe || abreSenao !== fechaSenao) desbalanceados.push(nome);
}
check('B', todasComAviso, 'toda minuta carrega o aviso "MINUTA — SUJEITA À VALIDAÇÃO JURÍDICA"');
check('B', orfasTotais.length === 0, `zero variável órfã (fora do catálogo)${orfasTotais.length ? ` — ${orfasTotais.join('; ')}` : ''}`);
check('B', desbalanceados.length === 0, `blocos condicionais balanceados em todas${desbalanceados.length ? ` — ${desbalanceados.join('; ')}` : ''}`);
const comMarcacao = [...corposPorArquivo.values()].filter((c) => c.includes('[VALIDAR COM ADVOGADO')).length;
check('B', comMarcacao === corposPorArquivo.size, `toda minuta tem ao menos uma marcação [VALIDAR COM ADVOGADO] (${comMarcacao}/${corposPorArquivo.size})`);

// ===== C. Registry consistente com os arquivos =====
const registrySrc = fs.readFileSync(path.join(RAIZ, 'src/features/contracts/juridico/biblioteca.ts'), 'utf8');
const importsMd = [...registrySrc.matchAll(/biblioteca\/([\w-]+\.md)\?raw/g)].map((m) => m[1]);
const slugs = [...registrySrc.matchAll(/slug:\s*'([\w-]+)'/g)].map((m) => m[1]);
check('C', importsMd.length === arquivos.length && arquivos.every((f) => importsMd.includes(f)),
  `registry importa exatamente os ${arquivos.length} arquivos da pasta`);
check('C', slugs.length === arquivos.length + 1, `registry tem ${slugs.length} entradas (16 minutas + master)`);
check('C', new Set(slugs).size === slugs.length, 'slugs únicos no registry');

// ===== D. Master parametrizável: variantes renderizam limpas =====
const corpoMaster = corposPorArquivo.get('contrato-master-minuta.md')!;
const base = {
  empresa: { id: 'e', nome: 'PrimeCharge', cnpj: '00.000.000/0001-00', endereco: 'Av. X, 100' },
  motorista: { id: 'm', nome_completo: 'João', cpf: '12345678901', status: 'ativo', cnh_numero: '99', cnh_categoria: 'B', cnh_validade: '2030-01-01', endereco: 'Rua A', email: 'j@t.com', telefone: '31 9999' },
  veiculo: { id: 'v', placa: 'ABC1D23', renavam: 'R1', chassi: 'C1', ano_fabricacao: 2024, ano_modelo: 2025, cor: 'Branco', status: 'disponivel', quilometragem: 1000, capacidade_bateria_kwh: 44, marca: { nome: 'BYD' }, modelo: { nome: 'Dolphin' } },
  template: { id: 't', nome: 'Master', versao_template: 1 },
  numeroContrato: 'C-000123',
  localAssinatura: 'Belo Horizonte/MG',
};
const CONDS = { valor_periodico: 1400, periodicidade: 'semanal', dia_vencimento: 5, data_inicio: '2026-09-01', data_fim_prevista: '2027-09-01', regras_especificas: 'Sem condições particulares.' };

// variante 1: COM caução + km CONTROLADA + seguro cadastrado
const s1 = montarSnapshot({ ...base, condicoes: { ...CONDS, valor_caucao: 3000, km_incluso: '3.000 km/mês', valor_km_excedente: 0.8 }, seguro: { seguradora: 'Seg X', apolice: 'AP-1', vigencia_inicio: '2026-09-01', vigencia_fim: '2027-09-01', franquia_valor: 5000 } });
const r1 = renderarCorpo(corpoMaster, s1);
check('D', r1.includes('QUILOMETRAGEM CONTROLADA') && !r1.includes('QUILOMETRAGEM LIVRE'), 'variante km controlada ativa a cláusula certa');
check('D', r1.includes('CAUÇÃO') && r1.includes('3.000,00') && !r1.includes('não exige caução'), 'variante com caução ativa a cláusula certa');
check('D', r1.includes('AP-1'), 'seguro cadastrado aparece na cláusula 10');
check('D', !r1.includes('{{') && !r1.includes('[SEM VALOR'), 'variante 1 renderiza sem {{...}} nem [SEM VALOR]');

// variante 2: SEM caução + km LIVRE + sem seguro
const s2 = montarSnapshot({ ...base, condicoes: { ...CONDS, valor_caucao: null, km_incluso: null, valor_km_excedente: null } });
const r2 = renderarCorpo(corpoMaster, s2);
check('D', r2.includes('QUILOMETRAGEM LIVRE') && !r2.includes('QUILOMETRAGEM CONTROLADA'), 'variante km livre ativa a cláusula certa');
check('D', r2.includes('não exige caução'), 'variante sem caução ativa a cláusula alternativa');
check('D', r2.includes('formalizada a apólice do período'), 'sem seguro cadastrado, a cláusula 10 usa o texto de apólice pendente');
check('D', !r2.includes('{{') && !r2.includes('[SEM VALOR'), 'variante 2 renderiza sem {{...}} nem [SEM VALOR]');

// catálogo cobre 100% do master
const orfasMaster = variaveisSemCatalogo(extrairVariaveis(corpoMaster));
check('D', orfasMaster.length === 0, `master sem variável órfã${orfasMaster.length ? ` (${orfasMaster.join(',')})` : ''}`);
check('D', Object.keys(CATALOGO_VARIAVEIS).length >= 45, `catálogo com ${Object.keys(CATALOGO_VARIAVEIS).length} variáveis documentadas`);

console.log(`\n${passes} PASS, ${fails} FALHOU`);
if (fails > 0) process.exit(1);
