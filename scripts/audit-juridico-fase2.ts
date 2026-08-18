/* eslint-disable no-console */
// Auditoria determinística da Fase 2 do Centro Jurídico: markdown (parser+HTML+pdf-content),
// diff de versões, extração da minuta master, validação pré-geração e GERAÇÃO REAL DE PDF
// (pdfmake em Node, mesmo montarDocDefinition do browser — teste do que o app realmente gera).
// Rodar: npx tsx --tsconfig tsconfig.app.json scripts/audit-juridico-fase2.ts
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { parseMarkdown, parseInline, markdownParaHtml, markdownParaPdfContent } from '../src/features/contracts/juridico/markdown';
import { diffCondicoes, diffLinhas, resumoDiff } from '../src/features/contracts/juridico/diff';
import { extrairCorpoDaMinuta, variaveisDoCorpo, AVISO_MINUTA } from '../src/features/contracts/juridico/minutaLib';
import { montarSnapshot, validarParaGeracao } from '../src/features/contracts/juridico/validacao';
import { montarDocDefinition } from '../src/features/contracts/juridico/pdf';
import { renderarCorpo, hashCorpo, variaveisFaltando } from '../src/features/contracts/juridico/lib';

let passes = 0;
let fails = 0;
const resultados: { caso: string; ok: boolean; msg: string }[] = [];
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  resultados.push({ caso, ok: cond, msg });
}

const MOTORISTA_OK = {
  id: 'm1', nome_completo: 'João Motorista', cpf: '12345678901', status: 'ativo',
  cnh_numero: '9988776655', cnh_categoria: 'B', cnh_validade: '2030-01-01', endereco: 'Rua A, 1',
};
const VEICULO_OK = {
  id: 'v1', placa: 'ABC1D23', renavam: 'REN1', chassi: 'CHS1', ano_fabricacao: 2024, ano_modelo: 2025,
  cor: 'Branco', status: 'disponivel', quilometragem: 1000, marca: { nome: 'BYD' }, modelo: { nome: 'Dolphin' },
};
const CONDICOES_OK = {
  valor_periodico: 1400, periodicidade: 'semanal', dia_vencimento: 5, valor_caucao: 3000,
  data_inicio: '2026-09-01', data_fim_prevista: '2027-09-01', km_incluso: 'livre', regras_especificas: '',
};
const EMPRESA_OK = { id: 'e1', nome: 'PrimeCharge LTDA', cnpj: '00.000.000/0001-00', endereco: 'Av. B, 2' };

async function main() {
  // ===== A. Markdown =====
  const md = '# Título\n\nParágrafo **negrito** e *itálico*.\nContinuação.\n\n- item 1\n- item 2\n\n---\n\n### Sub';
  const blocos = parseMarkdown(md);
  check('A', blocos.length === 6, `parser: 6 blocos (título, parágrafo, 2 itens, separador, sub) — achou ${blocos.length}`);
  check('A', blocos[0].tipo === 'titulo' && blocos[0].nivel === 1, 'parser: # vira título nível 1');
  check('A', blocos[1].tipo === 'paragrafo' && blocos[1].texto.includes('Continuação'), 'parser: linhas consecutivas viram UM parágrafo');
  const inline = parseInline('a **b** c *d* `{{e}}`');
  check('A', inline.some((t) => t.negrito && t.texto === 'b'), 'inline: **negrito**');
  check('A', inline.some((t) => t.italico && t.texto === 'd'), 'inline: *itálico*');
  check('A', inline.every((t) => !t.texto.includes('`')), 'inline: backticks removidos');
  const html = markdownParaHtml('## T\n\n<script>alert(1)</script>\n\n- **x**');
  check('A', html.includes('&lt;script&gt;'), 'HTML: texto é escapado (sem XSS)');
  check('A', html.includes('<h2>T</h2>') && html.includes('<li><strong>x</strong></li>'), 'HTML: estrutura h2 + li/strong');
  const pdfContent = markdownParaPdfContent('### C1\n\np1\n\n- a\n- b');
  check('A', pdfContent.length === 3, `pdf-content: título+parágrafo+ul agrupada = 3 nós (achou ${pdfContent.length})`);
  check('A', Array.isArray((pdfContent[2] as { ul?: unknown[] }).ul) && ((pdfContent[2] as { ul: unknown[] }).ul).length === 2, 'pdf-content: itens consecutivos agrupados numa ul');

  // ===== B. Diff =====
  const mud = diffCondicoes(
    { contrato: { valor: 'R$ 1.500,00', prazo: '12 meses' }, veiculo: { placa: 'AAA' } },
    { contrato: { valor: 'R$ 1.650,00', prazo: '12 meses' }, veiculo: { placa: 'AAA' } },
  );
  check('B', mud.length === 1 && mud[0].campo === 'contrato.valor' && mud[0].antes === 'R$ 1.500,00' && mud[0].depois === 'R$ 1.650,00',
    'diffCondicoes: detecta só o campo alterado, com antes/depois');
  const dl = diffLinhas('a\nb\nc', 'a\nX\nc');
  check('B', dl.filter((l) => l.tipo === 'removida').length === 1 && dl.filter((l) => l.tipo === 'adicionada').length === 1,
    'diffLinhas: b→X = 1 removida + 1 adicionada');
  const rd = resumoDiff(dl);
  check('B', rd.removidas === 1 && rd.adicionadas === 1, 'resumoDiff: contagem correta');
  check('B', diffLinhas('igual', 'igual').every((l) => l.tipo === 'igual'), 'diffLinhas: textos iguais = zero mudanças');

  // ===== C. Minuta master =====
  const minutaMd = fs.readFileSync(
    path.join(path.dirname(new URL(import.meta.url).pathname), '../docs/juridico/contrato-master-minuta.md'),
    'utf8',
  );
  const corpo = extrairCorpoDaMinuta(minutaMd);
  check('C', corpo.startsWith('## CONTRATO DE LOCAÇÃO'), 'extração: começa no título do contrato');
  check('C', !corpo.includes('Notas para o advogado'), 'extração: notas para o advogado ficam FORA do corpo');
  check('C', !corpo.includes('| Variável |'), 'extração: tabela de variáveis fica FORA do corpo');
  check('C', corpo.includes('[VALIDAR COM ADVOGADO'), 'extração: marcações [VALIDAR COM ADVOGADO] preservadas no corpo');
  const vars = variaveisDoCorpo(corpo);
  check('C', vars.includes('empresa.razao_social') && vars.includes('motorista.cpf') && vars.includes('veiculo.placa'),
    `extração: variáveis centrais presentes (${vars.length} no total)`);

  // ===== D. Snapshot + validação =====
  const template = { id: 't1', nome: 'Master', versao_template: 1 };
  const snapshot = montarSnapshot({ empresa: EMPRESA_OK, motorista: MOTORISTA_OK, veiculo: VEICULO_OK, condicoes: CONDICOES_OK, template });
  check('D', (snapshot as { motorista: { nome: string } }).motorista.nome === 'João Motorista', 'snapshot: motorista.nome');
  check('D', (snapshot as { contrato: { valor_periodico: string } }).contrato.valor_periodico.includes('1.400'), 'snapshot: valor formatado BRL');
  check('D', (snapshot as { veiculo: { marca_modelo: string } }).veiculo.marca_modelo === 'BYD Dolphin', 'snapshot: marca_modelo composto');

  const okVal = validarParaGeracao({
    motorista: MOTORISTA_OK, veiculo: VEICULO_OK, condicoes: CONDICOES_OK,
    templateCorpo: corpo, snapshot, veiculoTemContratoAtivo: false, hoje: '2026-08-18',
  });
  check('D', okVal.podeGerar && okVal.bloqueios.length === 0, `validação: cenário completo PODE gerar (bloqueios: ${okVal.bloqueios.map((b) => b.rotulo).join(',') || 'nenhum'})`);

  const cnhVencida = validarParaGeracao({
    motorista: { ...MOTORISTA_OK, cnh_validade: '2025-01-01' }, veiculo: VEICULO_OK, condicoes: CONDICOES_OK,
    templateCorpo: corpo, snapshot, hoje: '2026-08-18',
  });
  check('D', !cnhVencida.podeGerar && cnhVencida.bloqueios.some((b) => b.rotulo === 'CNH'), 'validação: CNH vencida BLOQUEIA');

  const veiculoOcupado = validarParaGeracao({
    motorista: MOTORISTA_OK, veiculo: VEICULO_OK, condicoes: CONDICOES_OK,
    templateCorpo: corpo, snapshot, veiculoTemContratoAtivo: true, hoje: '2026-08-18',
  });
  check('D', !veiculoOcupado.podeGerar && veiculoOcupado.bloqueios.some((b) => b.rotulo === 'Disponibilidade'),
    'validação: veículo com contrato ativo BLOQUEIA');

  const semEndereco = validarParaGeracao({
    motorista: { ...MOTORISTA_OK, endereco: null }, veiculo: VEICULO_OK, condicoes: CONDICOES_OK,
    templateCorpo: corpo, snapshot, hoje: '2026-08-18',
  });
  check('D', semEndereco.podeGerar && semEndereco.alertas.some((a) => a.rotulo === 'Endereço'),
    'validação: endereço vazio é ALERTA (gera, mas avisa)');

  const valorZero = validarParaGeracao({
    motorista: MOTORISTA_OK, veiculo: VEICULO_OK, condicoes: { ...CONDICOES_OK, valor_periodico: 0 },
    templateCorpo: corpo, snapshot, hoje: '2026-08-18',
  });
  check('D', !valorZero.podeGerar, 'validação: valor 0 BLOQUEIA');

  const snapshotFurado = { ...snapshot, motorista: { ...(snapshot as { motorista: Record<string, unknown> }).motorista, cpf: '' } };
  const varFaltando = validarParaGeracao({
    motorista: MOTORISTA_OK, veiculo: VEICULO_OK, condicoes: CONDICOES_OK,
    templateCorpo: corpo, snapshot: snapshotFurado, hoje: '2026-08-18',
  });
  check('D', !varFaltando.podeGerar && varFaltando.bloqueios.some((b) => b.rotulo === 'Variáveis do template'),
    'validação: variável crítica sem valor no snapshot BLOQUEIA a geração');

  // ===== E. Render final do contrato (motor único da Fase 1) =====
  const corpoFinal = renderarCorpo(corpo, snapshot);
  check('E', corpoFinal.includes('João Motorista') && corpoFinal.includes('ABC1D23'), 'render: dados do snapshot no documento');
  check('E', !/\{\{\s*(empresa|motorista|veiculo|contrato)\.[a-z_.]+\s*\}\}/.test(corpoFinal), 'render: nenhuma variável {{...}} sobra no documento final');
  check('E', variaveisFaltando(corpo, snapshot).length === 0, 'render: snapshot cobre todas as variáveis da minuta');

  // ===== F. PDF real (pdfmake Node, mesmo docDefinition do browser) =====
  const hash = await hashCorpo(corpoFinal);
  const dd = montarDocDefinition({
    numeroContrato: 'C-000123', rotuloVersao: 'v1.0', statusVersao: 'vigente', hashSha256: hash,
    corpo: corpoFinal, nomeMotorista: 'João Motorista', placaVeiculo: 'ABC1D23',
    geradoEm: '2026-08-18T12:00:00Z', templateAprovado: false,
  });
  const require2 = createRequire(import.meta.url);
  const pdfmakeNode = require2('pdfmake');
  pdfmakeNode.addFonts(require2('pdfmake/fonts/Roboto'));
  const doc = pdfmakeNode.createPdf(dd);
  const buf: Uint8Array = await doc.getBuffer();
  const outPath = '/tmp/contrato-teste-fase2.pdf';
  fs.writeFileSync(outPath, Buffer.from(buf));
  const raw = fs.readFileSync(outPath, 'latin1');
  check('F', raw.startsWith('%PDF-'), 'PDF: magic %PDF- (arquivo real, não extensão trocada)');
  check('F', buf.length > 20000, `PDF: tamanho plausível de contrato completo (${buf.length} bytes)`);
  // O texto no PDF é codificado como índices de glifo da fonte TTF embutida — grep no binário
  // não encontra nada. Extração REAL de texto via pdftotext (poppler-utils; presente no
  // ambiente de teste) prova que o conteúdo impresso é o correto.
  const { execSync } = await import('node:child_process');
  execSync(`pdftotext ${outPath} ${outPath}.txt`);
  const texto = fs.readFileSync(`${outPath}.txt`, 'utf8');
  check('F', texto.includes('C-000123'), 'PDF: contém o número do contrato');
  check('F', texto.includes('v1.0'), 'PDF: contém a versão');
  check('F', texto.includes(hash), 'PDF: contém o hash SHA-256 do corpo no rodapé');
  check('F', texto.includes(AVISO_MINUTA), 'PDF: contém o carimbo de minuta não aprovada');
  check('F', /Página 1 de \d+/.test(texto), 'PDF: paginação presente (Página 1 de N)');
  check('F', texto.includes('João Motorista') && texto.includes('ABC1D23'), 'PDF: partes e veículo do snapshot presentes');
  check('F', texto.includes('CLÁUSULA 1') && texto.includes('FORO'), 'PDF: cláusulas do contrato completas (início e fim)');

  for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
  console.log(`\n${passes} PASS, ${fails} FALHOU — PDF de amostra em ${outPath}`);
  if (fails > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
