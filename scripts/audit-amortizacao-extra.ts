/* eslint-disable no-console */
// Auditoria determinística da amortização extraordinária (fase 2026-08-14). Roda o MOTOR REAL
// (simulacaoEmpresarial.ts) + a agregação anual (fluxoAnual.ts) e valida os casos A–T pedidos.
// NÃO é bundlado no app (vive em scripts/, fora de src/). Rodar:
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-amortizacao-extra.ts
import {
  simularCrescimentoEmpresarial,
  resumirAmortizacaoExtra,
} from '../src/features/estrategia/intelligence/simulacaoEmpresarial';
import { agruparFluxoPorAno } from '../src/features/estrategia/intelligence/fluxoAnual';
import type { CenarioSimulacaoInput } from '../src/features/estrategia/types';

let passes = 0;
let fails = 0;
const resultados: { caso: string; ok: boolean; msg: string }[] = [];
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  resultados.push({ caso, ok: cond, msg });
}
const EPS = 0.02;
const quase = (a: number, b: number) => Math.abs(a - b) <= Math.max(EPS, Math.abs(b) * 1e-6);

// Cenário base: 1 veículo financiado, sem crescimento (objetivo = 1), caixa folgado pra a
// amortização caber, sem IR/juros de caixa (isola o efeito da amortização).
const base: CenarioSimulacaoInput = {
  nome: 'audit',
  capital_disponivel: 200000,
  veiculos_iniciais: 1,
  forma_aquisicao: 'financiado',
  valor_entrada_por_veiculo: 30000,
  valor_financiado_por_veiculo: 80000,
  taxa_juros_am_pct: 1.5,
  prazo_financiamento_meses: 48,
  aluguel_esperado_semanal_por_veiculo: 1400,
  ocupacao_esperada_pct: 95,
  inadimplencia_esperada_pct: 2,
  seguro_mensal_por_veiculo: 500,
  ipva_anual_por_veiculo: 2500,
  rastreador_mensal_por_veiculo: 79,
  lavagem_mensal_por_veiculo: 80,
  manutencao_mensal_por_veiculo: 120,
  depreciacao_am_pct: 1.2,
  licenciamento_anual_por_veiculo: 0,
  reinvestir_lucro: true,
  objetivo_veiculos: 1,
  prazo_desejado_meses: 60,
  amortizacao_estrategia: 'nunca',
  amortizacao_valor_manual: null,
  reserva_de_seguranca: 0,
  taxa_juros_investimento_aa_pct: 0,
  custo_abertura_empresa: 0,
  contador_mensal: 0,
  taxa_ir_pct: 0,
};
const run = (o: Partial<CenarioSimulacaoInput>) => simularCrescimentoEmpresarial({ ...base, ...o });

// ---- A — sem amortização extra ----
{
  const r = run({ amortizacao_estrategia: 'nunca' });
  check('A', r.meses.every((m) => m.amortizacaoExtraMensal === 0), 'nunca: toda amort. extra = 0');
  const resumo = resumirAmortizacaoExtra(r.meses, { ...base, amortizacao_estrategia: 'nunca' });
  check('A', resumo.totalAplicado === 0 && !resumo.algumMesLimitadoPorCaixa, 'nunca: total aplicado 0, sem limitação');
}

// ---- B — R$ 1.500 todo mês (com caixa suficiente) ----
{
  const cfg = { amortizacao_estrategia: 'todo_mes' as const, amortizacao_valor_manual: 1500 };
  const r = run(cfg);
  const m1 = r.meses.find((m) => m.mes === 1)!;
  check('B', quase(m1.amortizacaoExtraMensal, 1500), `mês 1 extra ≈ 1500 (${m1.amortizacaoExtraMensal.toFixed(2)})`);
  // enquanto houver dívida e caixa, aplica 1500
  const mesesComDivida = r.meses.filter((m) => m.mes > 0 && m.saldoDevedorTotal > 1500);
  check('B', mesesComDivida.slice(0, 5).every((m) => quase(m.amortizacaoExtraMensal, 1500)), 'primeiros meses com dívida aplicam 1500');
}

// ---- C — R$ configurado alto, caixa limita ----
{
  const cfg = { amortizacao_estrategia: 'todo_mes' as const, amortizacao_valor_manual: 10_000_000, capital_disponivel: 40000, reinvestir_lucro: false };
  const r = run(cfg);
  const limitado = r.meses.find((m) => m.mes > 0 && m.amortizacaoExtraMensal > 0.005 && m.amortizacaoExtraMensal < 10_000_000 - 1);
  check('C', !!limitado, 'existe mês com extra > 0 porém < configurado (caixa limitou)');
  check('C', r.meses.every((m) => m.caixaDisponivel >= -EPS), 'caixa nunca fica negativo');
  const resumo = resumirAmortizacaoExtra(r.meses, { ...base, ...cfg });
  check('C', resumo.algumMesLimitadoPorCaixa, 'resumo marca algumMesLimitadoPorCaixa');
}

// ---- D — amortização maior que saldo devedor ----
{
  const cfg = { valor_financiado_por_veiculo: 5000, amortizacao_estrategia: 'manual' as const, amortizacao_valor_manual: 50000 };
  const r = run(cfg);
  const m1 = r.meses.find((m) => m.mes === 1)!;
  check('D', m1.amortizacaoExtraMensal <= 5000 + EPS, `extra ≤ saldo (${m1.amortizacaoExtraMensal.toFixed(2)} ≤ 5000)`);
  check('D', r.meses.every((m) => m.saldoDevedorTotal >= -EPS), 'saldo devedor nunca negativo');
}

// ---- E — dívida zerada antes do fim ----
{
  const cfg = { amortizacao_estrategia: 'todo_mes' as const, amortizacao_valor_manual: 5000 };
  const r = run(cfg);
  const zerou = r.meses.find((m) => m.saldoDevedorTotal <= EPS);
  check('E', !!zerou, 'a dívida chega a zero dentro do horizonte');
  if (zerou) {
    const depois = r.meses.filter((m) => m.mes > zerou.mes);
    check('E', depois.every((m) => m.amortizacaoExtraMensal === 0), 'depois de quitar, extra = 0 nos meses seguintes');
  }
}

// ---- F — a cada 6 meses ----
{
  const cfg = { amortizacao_estrategia: 'a_cada_6_meses' as const, amortizacao_valor_manual: 3000 };
  const r = run(cfg);
  const comExtra = r.meses.filter((m) => m.amortizacaoExtraMensal > 0.005).map((m) => m.mes);
  check('F', comExtra.every((mes) => mes % 6 === 0), `extra só em múltiplos de 6 (${comExtra.slice(0, 5).join(',')})`);
  check('F', comExtra.length > 0, 'houve ao menos um evento a cada 6 meses');
}

// ---- G — estratégia nunca (redundante com A, explícito) ----
{
  const r = run({ amortizacao_estrategia: 'nunca', amortizacao_valor_manual: 9999 });
  check('G', r.meses.every((m) => m.amortizacaoExtraMensal === 0), 'nunca ignora valor configurado');
}

// ---- H — manual (uma vez, mês 1) ----
{
  const cfg = { amortizacao_estrategia: 'manual' as const, amortizacao_valor_manual: 4000 };
  const r = run(cfg);
  const comExtra = r.meses.filter((m) => m.amortizacaoExtraMensal > 0.005).map((m) => m.mes);
  check('H', comExtra.length === 1 && comExtra[0] === 1, `manual aplica só no mês 1 (${comExtra.join(',')})`);
}

// ---- I — meses específicos (a_cada_6) já coberto; valida valor exato ----
{
  const cfg = { amortizacao_estrategia: 'a_cada_6_meses' as const, amortizacao_valor_manual: 3000 };
  const r = run(cfg);
  const m6 = r.meses.find((m) => m.mes === 6)!;
  check('I', quase(m6.amortizacaoExtraMensal, 3000) || m6.amortizacaoExtraMensal <= m6.saldoDevedorTotal + 3000, `mês 6 aplicou (${m6.amortizacaoExtraMensal.toFixed(2)})`);
  const m5 = r.meses.find((m) => m.mes === 5)!;
  check('I', m5.amortizacaoExtraMensal === 0, 'mês 5 sem extra');
}

// ---- J — à vista não gera amortização ----
{
  const cfg = { forma_aquisicao: 'avista' as const, valor_entrada_por_veiculo: 110000, valor_financiado_por_veiculo: 0, amortizacao_estrategia: 'todo_mes' as const, amortizacao_valor_manual: 1500 };
  const r = run(cfg);
  check('J', r.meses.every((m) => m.amortizacaoExtraMensal === 0), 'à vista: extra = 0 mesmo com estratégia configurada');
  check('J', r.meses.every((m) => m.despesaBreakdown.parcelas === 0 && m.jurosFinanciamentoMensal === 0 && m.saldoDevedorTotal === 0), 'à vista: parcela/juros/saldo = 0');
}

// ---- K — financiamento (parcela e juros existem) ----
{
  const r = run({ amortizacao_estrategia: 'nunca' });
  const m1 = r.meses.find((m) => m.mes === 1)!;
  check('K', m1.despesaBreakdown.parcelas > 0 && m1.jurosFinanciamentoMensal > 0 && m1.saldoDevedorTotal > 0, 'financiado: parcela/juros/saldo > 0');
}

// ---- L — extra reduz juros futuros (B < A) ----
{
  const a = run({ amortizacao_estrategia: 'nunca' });
  const b = run({ amortizacao_estrategia: 'todo_mes', amortizacao_valor_manual: 2000 });
  const ja = a.meses.find((m) => m.mes === 6)!.jurosFinanciamentoMensal;
  const jb = b.meses.find((m) => m.mes === 6)!.jurosFinanciamentoMensal;
  check('L', jb < ja - EPS, `juros da dívida no mês 6 menor com extra (${jb.toFixed(2)} < ${ja.toFixed(2)})`);
}

// ---- M — extra reduz caixa no mês aplicado ----
{
  const a = run({ amortizacao_estrategia: 'nunca' });
  const b = run({ amortizacao_estrategia: 'todo_mes', amortizacao_valor_manual: 1500 });
  const ca = a.meses.find((m) => m.mes === 1)!.caixaDisponivel;
  const cb = b.meses.find((m) => m.mes === 1)!.caixaDisponivel;
  check('M', quase(ca - cb, 1500), `caixa do mês 1 menor por ~1500 (${(ca - cb).toFixed(2)})`);
}

// ---- N — extra NÃO é despesa (despesa e lucro do mês 1 idênticos A vs B) ----
{
  const a = run({ amortizacao_estrategia: 'nunca' });
  const b = run({ amortizacao_estrategia: 'todo_mes', amortizacao_valor_manual: 1500 });
  const ma = a.meses.find((m) => m.mes === 1)!;
  const mb = b.meses.find((m) => m.mes === 1)!;
  check('N', quase(ma.despesaMensal, mb.despesaMensal), 'despesa do mês 1 idêntica (extra não é despesa)');
  check('N', quase(ma.lucroMensal, mb.lucroMensal), 'lucro do mês 1 idêntico (extra não reduz lucro)');
}

// ---- O — extra NÃO entra direto no IR (IR do mês 1 idêntico) ----
{
  const a = run({ taxa_ir_pct: 15, amortizacao_estrategia: 'nunca' });
  const b = run({ taxa_ir_pct: 15, amortizacao_estrategia: 'todo_mes', amortizacao_valor_manual: 1500 });
  const ia = a.meses.find((m) => m.mes === 1)!.irMensal;
  const ib = b.meses.find((m) => m.mes === 1)!.irMensal;
  check('O', quase(ia, ib), `IR do mês 1 idêntico A vs B (${ia.toFixed(2)} = ${ib.toFixed(2)})`);
}

// ---- P — patrimônio maior com redução da dívida ----
{
  const a = run({ amortizacao_estrategia: 'nunca' });
  const b = run({ amortizacao_estrategia: 'todo_mes', amortizacao_valor_manual: 2000 });
  const pa = a.meses.find((m) => m.mes === 6)!.patrimonioLiquido;
  const pb = b.meses.find((m) => m.mes === 6)!.patrimonioLiquido;
  check('P', pb > pa - EPS, `patrimônio no mês 6 ≥ com extra (${pb.toFixed(2)} ≥ ${pa.toFixed(2)})`);
}

// ---- Q — sem dupla contagem: total = programada + extra; parcela = juros + programada ----
{
  const r = run({ amortizacao_estrategia: 'todo_mes', amortizacao_valor_manual: 1500 });
  check('Q', r.meses.every((m) => quase(m.amortizacaoTotalMensal, m.amortizacaoProgramadaMensal + m.amortizacaoExtraMensal)), 'amort. total = programada + extra em todo mês');
  check('Q', r.meses.every((m) => quase(m.despesaBreakdown.parcelas, m.jurosFinanciamentoMensal + m.amortizacaoProgramadaMensal)), 'parcela = juros da dívida + amort. programada (Price)');
}

// ---- R — fluxo mensal reflete MesSimulado (campos consumidos existem e batem) ----
{
  const r = run({ amortizacao_estrategia: 'todo_mes', amortizacao_valor_manual: 1500 });
  const m = r.meses.find((mm) => mm.mes === 1)!;
  check('R', typeof m.amortizacaoProgramadaMensal === 'number' && typeof m.amortizacaoExtraMensal === 'number' && typeof m.jurosFinanciamentoMensal === 'number', 'campos do fluxo mensal presentes no motor');
}

// ---- S — fluxo anual soma corretamente ----
{
  const r = run({ amortizacao_estrategia: 'todo_mes', amortizacao_valor_manual: 1500 });
  const anos = agruparFluxoPorAno(r.meses);
  const ano1 = anos[0];
  const somaExtraMeses1a12 = r.meses.filter((m) => m.mes >= 1 && m.mes <= 12).reduce((a, m) => a + m.amortizacaoExtraMensal, 0);
  check('S', quase(ano1.amortizacaoExtra, somaExtraMeses1a12), `ano 1 extra = soma dos meses (${ano1.amortizacaoExtra.toFixed(2)} = ${somaExtraMeses1a12.toFixed(2)})`);
  check('S', quase(ano1.amortizacaoDaDivida, ano1.amortizacaoProgramada + ano1.amortizacaoExtra), 'ano: total = programada + extra');
}

// ---- T — cards usam o mesmo motor (resumo = acumulado do último mês = soma dos meses) ----
{
  const cfg = { amortizacao_estrategia: 'todo_mes' as const, amortizacao_valor_manual: 1500 };
  const r = run(cfg);
  const resumo = resumirAmortizacaoExtra(r.meses, { ...base, ...cfg });
  const somaTodos = r.meses.reduce((a, m) => a + m.amortizacaoExtraMensal, 0);
  const ultimoAcum = r.meses[r.meses.length - 1].amortizacaoExtraAcumulada;
  check('T', quase(resumo.totalAplicado, ultimoAcum) && quase(resumo.totalAplicado, somaTodos), 'resumo.totalAplicado = acumulado do último mês = soma dos meses');
  check('T', resumo.configuradoPorEvento === 1500, 'resumo.configuradoPorEvento = valor configurado');
}

// ---- Antes x Depois (resumo caso 29) ----
{
  const a = run({ amortizacao_estrategia: 'nunca' });
  const b = run({ amortizacao_estrategia: 'todo_mes', amortizacao_valor_manual: 2000 });
  const sa = a.meses.find((m) => m.mes === 12)!;
  const sb = b.meses.find((m) => m.mes === 12)!;
  check('AxB', sb.saldoDevedorTotal < sa.saldoDevedorTotal - EPS, 'com extra: saldo devedor menor no mês 12');
  check('AxB', sb.patrimonioLiquido > sa.patrimonioLiquido - EPS, 'com extra: patrimônio maior no mês 12');
}

// ---- Relatório ----
const porCaso = new Map<string, { ok: number; fail: number }>();
for (const r of resultados) {
  const acc = porCaso.get(r.caso) ?? { ok: 0, fail: 0 };
  if (r.ok) acc.ok++;
  else acc.fail++;
  porCaso.set(r.caso, acc);
  if (!r.ok) console.log(`  ✗ [${r.caso}] ${r.msg}`);
}
console.log('\nResumo por caso:');
for (const [caso, acc] of porCaso) console.log(`  ${acc.fail === 0 ? '✓' : '✗'} ${caso}: ${acc.ok} ok${acc.fail ? `, ${acc.fail} FALHOU` : ''}`);
console.log(`\n${fails === 0 ? '✅' : '❌'} ${passes} asserções passaram, ${fails} falharam.`);
if (fails > 0) process.exit(1);
