/* eslint-disable no-console */
// Auditoria determinística dos helpers puros do Centro Jurídico (render/hash do documento).
// Complementa a suíte SQL (supabase/tests/60_juridico.sql), que cobre a espinha no banco.
// NÃO é bundlado no app (vive em scripts/, fora de src/). Rodar:
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-juridico-lib.ts
import { renderarCorpo, extrairVariaveis, variaveisFaltando, hashCorpo } from '../src/features/contracts/juridico/lib';

let passes = 0;
let fails = 0;
const resultados: { caso: string; ok: boolean; msg: string }[] = [];
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  resultados.push({ caso, ok: cond, msg });
}

async function main() {
  const template =
    'Contrato entre {{empresa.razao_social}} e {{ motorista.nome }} (CPF {{motorista.cpf}}). ' +
    'Veículo {{veiculo.placa}}. Valor {{contrato.valor}}.';
  const snapshot = {
    empresa: { razao_social: 'PrimeCharge LTDA' },
    motorista: { nome: 'João', cpf: '00000000001' },
    veiculo: { placa: 'ABC1D23' },
    contrato: { valor: 'R$ 1.400,00' },
  };

  // A — render substitui todas as variáveis, tolera espaços {{ x }}
  const corpo = renderarCorpo(template, snapshot);
  check('A', corpo.includes('PrimeCharge LTDA'), 'razao_social substituída');
  check('A', corpo.includes('João'), 'nome (com espaços no delimitador) substituído');
  check('A', corpo.includes('00000000001'), 'cpf aninhado substituído');
  check('A', corpo.includes('ABC1D23'), 'placa substituída');
  check('A', !corpo.includes('{{'), 'não sobra nenhum delimitador não resolvido');

  // B — variável sem valor no snapshot vira marcador VISÍVEL, não some silenciosamente
  const corpoFuro = renderarCorpo('Olá {{motorista.nome}}, doc {{motorista.rg}}.', snapshot);
  check('B', corpoFuro.includes('[SEM VALOR: motorista.rg]'), 'furo de dado fica visível no documento');

  // C — extrairVariaveis lista todas as chaves únicas
  const vars = extrairVariaveis(template);
  check('C', vars.length === 5, `extrai 5 variáveis (achou ${vars.length})`);
  check('C', vars.includes('motorista.cpf'), 'inclui motorista.cpf');

  // D — variaveisFaltando aponta exatamente o que falta no snapshot
  const faltando = variaveisFaltando('{{a.b}} {{c}} {{empresa.razao_social}}', snapshot);
  check('D', faltando.includes('a.b') && faltando.includes('c'), 'aponta a.b e c como faltando');
  check('D', !faltando.includes('empresa.razao_social'), 'não marca o que existe como faltando');

  // E — hash é SHA-256 (64 hex), determinístico, e muda se o corpo mudar (integridade)
  const h1 = await hashCorpo(corpo);
  const h2 = await hashCorpo(corpo);
  const h3 = await hashCorpo(corpo + ' ');
  check('E', /^[0-9a-f]{64}$/.test(h1), `hash é 64 hex (${h1.slice(0, 12)}…)`);
  check('E', h1 === h2, 'hash determinístico (mesmo corpo -> mesmo hash)');
  check('E', h1 !== h3, 'hash muda com 1 caractere a mais (detecta adulteração)');
  // valor conhecido do SHA-256 de "abc"
  check('E', (await hashCorpo('abc')) === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    'SHA-256("abc") confere com o vetor de teste conhecido');

  for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
  console.log(`\n${passes} PASS, ${fails} FALHOU`);
  if (fails > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
