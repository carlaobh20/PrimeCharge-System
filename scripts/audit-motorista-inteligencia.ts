/* eslint-disable no-console */
// Auditoria determinística da FASE 12.2 — Inteligência Operacional do Motorista.
// O sistema DESCREVE os registros: janelas ampliadas (km/corridas/recargas por período),
// evolução período × anterior (SEM COMPARAÇÃO com < 3 dias), recargas agregadas com R$/kWh
// (nunca sem kWh), energia estimada × registrada ("diferença entre fontes", sem eleger a
// correta), qualidade em camadas com definição explícita de COMPLETO, inconsistências
// factuais (achado/origem/falta), cenários operacionais (embutem os da Fase 9 + média
// registrada), imutabilidade e vocabulário proibido.
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-motorista-inteligencia.ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  calcularConsumoEstimado,
  calcularCustoKm,
  calcularRpCorrida,
  calcularRph,
  calcularRpKm,
  cenariosOperacionais,
  cenariosPredefinidos,
  compararEnergia,
  eficienciaVsPremissa,
  evolucaoPeriodo,
  inconsistenciasOperacionais,
  janelaOperacional,
  projecoesDuplas,
  qualidadeOperacional,
  resumoRecargas,
  simular,
  type GanhoJanela,
} from '../src/features/motorista-app/lib/metas';

let passes = 0;
let fails = 0;
const resultados: { caso: string; ok: boolean; msg: string }[] = [];
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  resultados.push({ caso, ok: cond, msg });
}
const aprox = (a: number | null | undefined, b: number, tol = 0.01) => a != null && Math.abs(a - b) <= tol;
const dia = (n: number, valor: number, horas: number | null = null, km: [number, number] | null = null, corridas: number | null = null): GanhoJanela => ({
  data: new Date(Date.UTC(2026, 7, n, 12)).toISOString().slice(0, 10),
  valor,
  horas,
  km_inicio: km?.[0] ?? null,
  km_fim: km?.[1] ?? null,
  corridas,
});

// ======================= A — CASOS OBRIGATÓRIOS ==============================================
check('A', calcularRph(1000, 20) === 50, 'OBRIGATÓRIO: 1.000/20h = 50/h');
check('A', calcularRpKm(1000, 200) === 5, 'OBRIGATÓRIO: 1.000/200km = 5/km');
check('A', calcularRpCorrida(1000, 10) === 100, 'OBRIGATÓRIO: 1.000/10 corridas = 100/corrida');
check('A', aprox(eficienciaVsPremissa(47.8, 40), 119.5), 'OBRIGATÓRIO: 47,80 × 40 = 119,5% (variação +19,5%)');
check('A', calcularConsumoEstimado(200, 15) === 30, 'OBRIGATÓRIO: 200km × 15/100 = 30 kWh ESTIMADOS');
check('A', calcularCustoKm(90, 150) === 0.6, 'custo/km = 90/150 = 0,60');

// ======================= B — janela ampliada (Módulo 3) ======================================
const hoje = '2026-08-20';
const ganhosB = [
  dia(20, 400, 10, [100, 250], 18),
  dia(19, 300, 6, null, null),
  dia(18, 350, 7, [250, 350], 10),
];
const recargasB = [
  { data: '2026-08-20', custo: 32.4, kwh: 18.7 },
  { data: '2026-08-18', custo: 20, kwh: null },
  { data: '2026-08-01', custo: 99, kwh: 50 }, // fora da janela de 7
];
const j7 = janelaOperacional(ganhosB, 7, hoje, 378.46, recargasB);
check('B', j7.diasRegistrados === 3 && j7.diasComHoras === 3, 'dias registrados e com horas contados');
check('B', j7.kmTotal === 250 && j7.kmPorDia === 125, 'km da janela = 150+100 = 250 (2 dias com km → 125 km/dia)');
check('B', aprox(j7.rpkm, 4.2), 'R$/km da janela = 1.050/250 = 4,20');
check('B', j7.corridasTotal === 28, 'corridas da janela = 18+10');
check('B', aprox(j7.rpCorrida, 26.79), 'R$/corrida usa SÓ o ganho dos dias com corridas (750/28)');
check('B', j7.recargasQtd === 2 && aprox(j7.custoOperacionalRegistrado, 52.4), 'recargas DA JANELA (a de 01/08 fica fora)');
check('B', aprox(j7.custoPorKmRegistrado, 0.21), 'custo/km registrado = 52,40/250');
const jVazia = janelaOperacional([], 7, hoje, 100, []);
check('B', jVazia.kmTotal === null && jVazia.corridasTotal === null && jVazia.rpkm === null, 'janela vazia → nulls (nada preenchido)');
const jSemDiario = janelaOperacional([dia(20, 400, 8)], 7, hoje, 100, []);
check('B', jSemDiario.kmTotal === null && jSemDiario.recargasQtd === 0, 'dias sem diário → km/corridas SEM DADO, recargas 0');

// ======================= C — evolução período × anterior (Módulos 4/5) =======================
const ganhosC = [
  // 7 atuais (14–20): 3 dias
  dia(20, 500, 10, [0, 100], 10), dia(18, 450, 10, [100, 200], 10), dia(16, 480, 10, null, 8),
  // 7 anteriores (7–13): 3 dias
  dia(13, 400, 10, [200, 280], 9), dia(11, 420, 10, null, null), dia(9, 410, 10, [280, 350], 8),
];
const evC = evolucaoPeriodo(ganhosC, [], 7, hoje, 300);
check('C', evC != null, 'evolução 7×7 com 3+3 dias existe');
const campoGanho = evC?.campos.find((c) => c.rotulo === 'Ganho');
check('C', campoGanho != null && campoGanho.atual === 1430 && campoGanho.anterior === 1230 && campoGanho.variacaoAbs === 200, 'ganho: 1.430 × 1.230 = +200');
check('C', campoGanho != null && aprox(campoGanho.variacaoPct, 16.3, 0.1), 'variação % = +16,3');
const campoKm = evC?.campos.find((c) => c.rotulo === 'Km');
check('C', campoKm != null && campoKm.atual === 200 && campoKm.anterior === 150, 'km comparados entre períodos');
check('C', evolucaoPeriodo([dia(20, 100), dia(19, 100), dia(18, 100)], [], 7, hoje, 100) === null, 'anterior sem 3 dias → SEM COMPARAÇÃO (null)');
const evZero = evolucaoPeriodo([
  dia(20, 100), dia(19, 100), dia(18, 100),
  dia(13, 0, 5), dia(12, 0, 4), dia(11, 0, 3),
], [], 7, hoje, 100);
check('C', evZero != null && evZero.campos.find((c) => c.rotulo === 'Ganho')?.variacaoPct === null, 'anterior 0 → % null (nunca Infinity)');

// ======================= D — recargas agregadas (Módulo 7) ===================================
const rD = resumoRecargas([
  { custo: 32.4, kwh: 18.7 },
  { custo: 15, kwh: null },
  { custo: 41.3, kwh: 22.3 },
]);
check('D', rD.quantidade === 3 && aprox(rD.custoTotal, 88.7), '3 recargas, custo total 88,70');
check('D', aprox(rD.custoMedio, 29.57), 'custo médio = 88,70/3');
check('D', aprox(rD.kwhTotal, 41) && rD.recargasComKwh === 2, 'kWh total só das COM kWh (18,7+22,3)');
check('D', aprox(rD.kwhMedio, 20.5), 'kWh médio das que têm kWh');
check('D', aprox(rD.rsPorKwh, 1.8, 0.01), 'R$/kWh = (32,40+41,30)/41 — a recarga sem kWh fica FORA');
const rSemKwh = resumoRecargas([{ custo: 30, kwh: null }]);
check('D', rSemKwh.rsPorKwh === null && rSemKwh.kwhTotal === null, 'sem kWh → R$/kWh NÃO INFORMADO (nunca calculado)');
check('D', resumoRecargas([]).custoMedio === null, 'sem recargas → médias null');

// ======================= E — energia estimada × registrada (Módulo 8) ========================
const eE = compararEnergia(30, 41);
check('E', eE != null && eE.diferenca === 11, 'diferença = registrado − estimado (+11 kWh)');
check('E', compararEnergia(null, 41) === null, 'sem estimativa → sem comparação');
check('E', compararEnergia(30, null) === null, 'sem registro → sem comparação (nunca soma os dois)');
check('E', compararEnergia(NaN, 41) === null && compararEnergia(0, 41) === null, 'guards');

// ======================= F — qualidade em camadas (Módulo 6) =================================
const ganhosF = [
  dia(1, 400, 8, [0, 100], 12), // completo
  dia(2, 300, 6, null, null), // sem km
  dia(3, 350, null, [100, 200], null), // sem horas
  dia(4, 0, 5, null, null), // horas sem ganho
];
const qF = qualidadeOperacional(ganhosF, new Set([ganhosF[0].data, ganhosF[3].data]));
check('F', qF.registrados === 4 && qF.comKm === 2 && qF.comCorridas === 1 && qF.comRecarga === 2, 'camadas: km 2, corridas 1, recarga 2');
check('F', qF.completosDiario === 1, 'COMPLETO (definição explícita: ganho+horas+km) = só o dia 1');
check('F', qF.completos === 2, 'a métrica antiga da F10 (ganho+horas) continua intacta — REUSO, não substituição');
const fonteQ = readFileSync(join(new URL('.', import.meta.url).pathname, '..', 'src/features/motorista-app/lib/metas.ts'), 'utf8');
check('F', /COMPLETO \(definição explícita\)/.test(fonteQ), 'definição de "completo" declarada no código');

// ======================= G — inconsistências factuais (Módulo 10) ============================
const incG = inconsistenciasOperacionais({
  ganhos: [
    dia(1, 400, null), // ganho sem horas
    dia(2, 0, 6), // horas sem ganho
    dia(3, 0, null, [0, 50]), // km sem ganho
    dia(4, 300, 6, null, null),
    { ...dia(5, 200, 5), km_inicio: 100, km_fim: null }, // km incompleto
  ],
  recargas: [{ data: 'x', custo: 30, kwh: null }],
  temRecorrenciaRecarga: true,
  divergenciaOdometroKm: 4,
});
check('G', incG.length === 7, '7 achados: sem horas, horas sem ganho, km sem ganho, km incompleto, recarga sem kWh, recorrência+eventos, odômetro');
check('G', incG.every((i) => i.achado && i.origem && i.falta), 'cada item responde: achado / origem / o que falta');
check('G', incG.every((i) => !/errad|culpa|você deve/i.test(i.achado + i.origem + i.falta)), 'nenhum julgamento ("você fez errado" proibido)');
check('G', inconsistenciasOperacionais({ ganhos: [dia(1, 400, 8, [0, 100])], recargas: [], temRecorrenciaRecarga: false, divergenciaOdometroKm: null }).length === 0, 'registros completos → zero inconsistências');

// ======================= H — cenários operacionais (Módulo 11) + imutabilidade ===============
const baseH = { custoTotal: 9840, diasTrabalho: 26, rendaHora: 40 };
const congeladaH = JSON.stringify(baseH);
const cenH = cenariosOperacionais(baseH, 47.8);
check('H', JSON.stringify(baseH) === congeladaH, 'IMUTABILIDADE: cenários não alteram a base');
check('H', cenariosPredefinidos(baseH).length === 5 && cenH.length === 8, 'REUSO: 5 da Fase 9 embutidos + 3 novos (+3h, +1 dia, média registrada)');
check('H', cenH.some((c) => c.rotulo === '+3h por dia'), '+3h/dia presente');
check('H', cenH.some((c) => c.rotulo === '+1 dia trabalhado' && c.impacto.includes('378,46')), '+1 dia recalcula a meta diária');
const cMedia = cenH.find((c) => c.rotulo.includes('média registrada'));
check('H', cMedia != null && cMedia.impacto.includes('95,60') && cMedia.impacto.includes('matematicamente'), 'exemplo literal: +2h × 47,80 = R$95,60 "matematicamente" (nunca "você vai ganhar")');
check('H', cMedia != null && /não é promessa|simulação/i.test(cMedia.impacto), 'rotulado como simulação');
check('H', cenariosOperacionais(baseH, null).length === 7, 'sem histórico → sem a linha da média (nada inventado)');
const simBase = { custoTotal: 9840, diasTrabalho: 26, rendaHora: 40 };
const simFrozen = JSON.stringify(simBase);
simular(simBase, { rendaHora: 47.8 });
check('H', JSON.stringify(simBase) === simFrozen, 'simular() continua imutável (regressão do Módulo 27 da F11)');

// ======================= I — projeções (Módulo 12) ===========================================
const pI = projecoesDuplas({ realizado: 4820, diasRestantes: 12, metaDiariaOriginal: 378.46, mediaRealDia: 540, diasRegistrados: 14 });
check('I', pI.pelaPremissa.formula.includes('PREMISSA') && pI.peloHistorico?.formula.includes('média registrada') === true, 'TRÊS NÚMEROS: fontes das projeções declaradas');

// ======================= J — fonte: UI, vocabulário, migration, performance ==================
const raiz = join(new URL('.', import.meta.url).pathname, '..');
const lerTudo = (dir: string): string[] => {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...lerTudo(p));
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
};
const fonteApp = lerTudo(join(raiz, 'src/features/motorista-app')).map((p) => ({ p, s: readFileSync(p, 'utf8') }));
const proibidos = /você deve trabalhar|você precisa trabalhar|renda garantida|\bsalário\b|lucro garantido|melhor horário|horário ideal|trabalhe mais|indo mal|indo bem/i;
let vocabOk = true;
for (const { p, s } of fonteApp) {
  for (const linha of s.split('\n')) {
    if (/nunca|proibid|não usa|jamais|NÃO/i.test(linha)) continue;
    if (proibidos.test(linha)) { vocabOk = false; console.error(`   vocabulário proibido em ${p}: ${linha.trim()}`); }
  }
}
check('J', vocabOk, 'vocabulário proibido (Módulo 22) ausente de todo o app do motorista');
const tres = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/TresNumerosCard.tsx'), 'utf8');
check('J', /Meta/.test(tres) && /Real/.test(tres) && /Projeção/.test(tres) && /não é promessa/.test(tres), 'TRÊS NÚMEROS: meta × real × projeção, projeção nunca é promessa');
check('J', /PELA PREMISSA|PELO HISTÓRICO/.test(tres), 'fonte da projeção declarada no visual');
const opSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/OperacaoRealCard.tsx'), 'utf8');
check('J', /Baseado exclusivamente nos seus registros/.test(opSrc), 'subtítulo "Baseado exclusivamente nos seus registros" (Módulo 13)');
check('J', /SEM COMPARAÇÃO/.test(opSrc), 'evolução sem dados → SEM COMPARAÇÃO explícito');
check('J', /90/.test(opSrc) && /\[7, 14, 30, 90\]/.test(opSrc), 'janela de 90 dias no seletor');
check('J', /sem causalidade/.test(opSrc), 'evolução declara: comparação matemática, sem causalidade');
const incSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/InconsistenciasCard.tsx'), 'utf8');
check('J', /Origem:/.test(incSrc) && /O que falta:/.test(incSrc), 'card de inconsistências mostra origem e o que falta');
const carroSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/CarroCard.tsx'), 'utf8');
check('J', /FIXO/.test(carroSrc) && /OPERACIONAL/.test(carroSrc) && /ENERGÉTICO/.test(carroSrc), 'carro em TRÊS camadas nunca misturadas (Módulo 9)');
const migs = readdirSync(join(raiz, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 48);
check('J', migs.every((f) => f.startsWith('0049') || f.startsWith('0050')), 'ZERO migration na Fase 12.2 (Módulo 18); acima da 0048 só existem 0049/0050 (Copiloto — Fase 16)');
check('J', fonteApp.every(({ s }) => !s.includes("from 'recharts'") && !s.includes('pdfmake') && !s.includes('fflate') && !s.includes('chart.js')), 'sem bibliotecas de gráfico (Módulo 21)');
check('J', fonteApp.filter(({ s }) => /365 \/ 12|52 \/ 12/.test(s)).length === 1, 'fatores de conversão continuam ÚNICOS (sem segundo motor)');
const hookSrc = readFileSync(join(raiz, 'src/features/motorista-app/hooks/useMinhaMeta.ts'), 'utf8');
check('J', !/renda_hora:\s*(realHora|d\.real|media)/i.test(hookSrc), 'premissa continua NUNCA substituída automaticamente');

// ======================= relatório ===========================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-motorista-inteligencia: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
