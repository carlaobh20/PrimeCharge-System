/* eslint-disable no-console */
// Auditoria determinística da FASE 11 — Plano Operacional do Motorista.
// Cobre: meta de hoje (original × rebalanceada), horas pela PREMISSA × pelo HISTÓRICO,
// "se eu parar agora", simulações ±1/2/3h (IMUTÁVEIS — Módulo 27), meta de amanhã, visão
// semanal + "como estou indo?", calendário com R$/h e dia encerrado, horas p/ cobrir o carro,
// e a auditoria de duplicação/vocabulário no fonte.
// CASOS OBRIGATÓRIOS: meta 10.000, realizado 4.500, 12 dias → falta 5.500 → 458,33/dia;
// a R$40/h → 11h27/dia; a R$47,80/h → ~9h35/dia.
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-motorista-plano.ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  calcularMetaHoje,
  formatHoras,
  horasParaValor,
  metaDeAmanha,
  montarCalendario,
  rebalancear,
  resumoSemana,
  seEuPararAgora,
  simularHorasExtras,
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

// ======================= A — CASOS OBRIGATÓRIOS ==============================================
check('A', 10000 - 4500 === 5500, 'OBRIGATÓRIO: falta = 10.000 − 4.500 = 5.500');
const novaMeta = rebalancear(10000, 4500, 12);
check('A', aprox(novaMeta, 458.33), 'OBRIGATÓRIO: 5.500 / 12 = 458,33/dia');
const hPremissa = horasParaValor(458.33, 40);
check('A', hPremissa != null && formatHoras(hPremissa) === '11h27', 'OBRIGATÓRIO: 458,33 a R$40/h = 11h27/dia');
const hHistorico = horasParaValor(458.33, 47.8);
check('A', hHistorico != null && formatHoras(hHistorico) === '9h35', 'OBRIGATÓRIO: 458,33 a R$47,80/h ≈ 9h35/dia');

// ======================= B — horas pela premissa × histórico (Módulo 2) ======================
check('B', horasParaValor(400, 0) === null, 'taxa 0 → null (nunca Infinity)');
check('B', horasParaValor(400, null) === null, 'sem histórico → null ("SEM DADO")');
check('B', horasParaValor(-50, 40) === 0, 'valor negativo saneado → 0h');
check('B', horasParaValor(NaN, 40) === 0, 'NaN → 0h');
const h383 = horasParaValor(383, 40);
check('B', h383 != null && formatHoras(h383) === '9h34', 'exemplo: 383/40 ≈ 9h34 (premissa)');
const h383h = horasParaValor(383, 47.8);
check('B', h383h != null && formatHoras(h383h) === '8h01', 'mesmo valor pelo histórico 47,80 ≈ 8h01 (383/47,8 = 8,0125h)');

// ======================= C — se eu parar agora (Módulo 5) ====================================
const parar = seEuPararAgora({
  metaMensal: 10000,
  realizadoAcumuladoIncluindoHoje: 4500,
  diasRestantesDepoisDeHoje: 12,
  metaHoje: 458.33,
  realizadoHoje: 200,
});
check('C', parar != null && aprox(parar.diferencaHoje, -258.33), 'diferença de hoje = 200 − 458,33 (factual, negativa)');
check('C', parar != null && aprox(parar.novaMetaDia, 458.33), 'parar agora → nova média nos 12 dias = 5.500/12');
check('C', parar != null && aprox(parar.faltaDepoisDeHoje, 5500), 'falta depois de hoje = 5.500');
check('C', seEuPararAgora({ metaMensal: 10000, realizadoAcumuladoIncluindoHoje: 4500, diasRestantesDepoisDeHoje: 12, metaHoje: 458, realizadoHoje: null }) === null,
  'sem lançamento hoje → null ("Não é possível calcular" — nada inventado)');
const pararUltimo = seEuPararAgora({ metaMensal: 10000, realizadoAcumuladoIncluindoHoje: 9000, diasRestantesDepoisDeHoje: 0, metaHoje: 1000, realizadoHoje: 500 });
check('C', pararUltimo != null && pararUltimo.novaMetaDia === null && aprox(pararUltimo.faltaDepoisDeHoje, 1000), 'último dia → sem nova média (null), falta explícita');
const pararCoberto = seEuPararAgora({ metaMensal: 10000, realizadoAcumuladoIncluindoHoje: 11000, diasRestantesDepoisDeHoje: 5, metaHoje: 0, realizadoHoje: 800 });
check('C', pararCoberto != null && pararCoberto.faltaDepoisDeHoje === 0 && pararCoberto.novaMetaDia === 0, 'meta já coberta → falta 0, nova média 0 (nunca negativa)');

// ======================= D — simulações ±horas (Módulos 6/7) + IMUTABILIDADE (27) ============
const entradaSim = {
  horas: 2,
  premissaHora: 40,
  historicoHora: 47.8,
  metaHoje: 458.33,
  realizadoHoje: 200,
  metaMensal: 10000,
  realizadoAcumuladoIncluindoHoje: 4700,
  diasRestantesDepoisDeHoje: 12,
};
const congelada = JSON.stringify(entradaSim);
const sim2 = simularHorasExtras(entradaSim);
check('D', JSON.stringify(entradaSim) === congelada, 'IMUTABILIDADE: simular NÃO altera a entrada (Módulo 27)');
check('D', sim2 != null && sim2.origemTaxa === 'historico' && sim2.taxaUsada === 47.8, 'usa o HISTÓRICO quando disponível (origem declarada)');
check('D', sim2 != null && aprox(sim2.ganhoAdicional, 95.6), '+2h × 47,80 = +95,60');
check('D', sim2 != null && aprox(sim2.novaFaltaHoje, 162.73), 'nova falta hoje = 458,33 − 295,60');
check('D', sim2 != null && aprox(sim2.novaMetaRestanteDia, 433.7), 'impacto no mês: (10.000−4.795,60)/12 = 433,70');
const simSemHist = simularHorasExtras({ ...entradaSim, historicoHora: null, horas: 1 });
check('D', simSemHist != null && simSemHist.origemTaxa === 'premissa' && simSemHist.ganhoAdicional === 40, 'sem histórico → premissa (+1h = +40)');
const simMenos = simularHorasExtras({ ...entradaSim, horas: -1 });
check('D', simMenos != null && aprox(simMenos.ganhoAdicional, -47.8) && aprox(simMenos.novaFaltaHoje, 306.13), '−1h reduz 47,80 e aumenta a falta (fato, sem juízo)');
check('D', simularHorasExtras({ ...entradaSim, horas: 0 }) === null, '0h → null (não simula nada)');
check('D', simularHorasExtras({ ...entradaSim, premissaHora: 0, historicoHora: null }) === null, 'sem taxa nenhuma → null (nunca ÷0)');
const simNaN = simularHorasExtras({ horas: 2, premissaHora: 40, historicoHora: null, metaHoje: NaN, realizadoHoje: NaN, metaMensal: NaN, realizadoAcumuladoIncluindoHoje: NaN, diasRestantesDepoisDeHoje: NaN });
check('D', simNaN != null && Number.isFinite(simNaN.novaFaltaHoje) && Number.isFinite(simNaN.ganhoAdicional), 'NaN nas entradas → saídas finitas');

// ======================= E — meta de amanhã (Módulo 12) ======================================
const amanha = metaDeAmanha({ metaMensal: 10000, realizadoAcumuladoIncluindoHoje: 4500, diasRestantesDepoisDeHoje: 12, metaDiariaOriginal: 400 });
check('E', amanha.original === 400 && aprox(amanha.rebalanceada, 458.33), 'amanhã: original 400 preservada; rebalanceada 458,33');
const amanhaAcima = metaDeAmanha({ metaMensal: 10000, realizadoAcumuladoIncluindoHoje: 9500, diasRestantesDepoisDeHoje: 5, metaDiariaOriginal: 400 });
check('E', aprox(amanhaAcima.rebalanceada, 100), 'mês adiantado → rebalanceada CAI (500/5=100) sem tocar a original');
check('E', metaDeAmanha({ metaMensal: 10000, realizadoAcumuladoIncluindoHoje: 4500, diasRestantesDepoisDeHoje: 0, metaDiariaOriginal: 400 }).rebalanceada === null, 'último dia → rebalanceada null');

// ======================= F — visão semanal (Módulos 14/15) ===================================
// 2026-08-20 é quinta → semana Seg 17 .. Dom 23.
const ganhosF = [
  { data: '2026-08-17', valor: 400, horas: 10, observacao: 'dia_encerrado' },
  { data: '2026-08-18', valor: 300, horas: null, observacao: null },
  { data: '2026-08-19', valor: 500, horas: 10, observacao: null },
  { data: '2026-08-10', valor: 999, horas: 9, observacao: null }, // fora da semana
];
const sem = resumoSemana(ganhosF, '2026-08-20', 400, 26, 31);
check('F', sem.dias.length === 7 && sem.dias[0].label === 'SEG' && sem.dias[0].data === '2026-08-17', 'semana Seg→Dom ancorada corretamente');
check('F', sem.totalValor === 1200 && sem.diasRegistrados === 3, 'só a semana corrente entra (999 do dia 10 fica fora)');
check('F', sem.totalHoras === 20 && aprox(sem.rsHora, 45), 'R$/h da semana usa só dias completos (900/20h = 45)');
check('F', sem.dias[0].encerrado && !sem.dias[2].encerrado, 'flag de dia encerrado por dia');
check('F', sem.dias[1].status === 'abaixo' && sem.dias[2].status === 'acima' && sem.dias[0].status === 'atingida', 'status por dia contra a meta original');
check('F', sem.dias[5].status === 'sem_dado' && sem.dias[5].futuro, 'sábado futuro = SEM DADO + marcado futuro');
check('F', sem.diasPlanejadosSemana === 6 && sem.metaSemanalEstimada === 2400, 'meta semanal = 400 × 6 dias planejados (26×7/31≈6) — fórmula declarada');
check('F', aprox(sem.diferenca, -1200), 'diferença = 1.200 − 2.400 (factual, negativa)');
const semVazia = resumoSemana([], '2026-08-20', 400, 26, 31);
check('F', semVazia.diasRegistrados === 0 && semVazia.rsHora === null && semVazia.totalHoras === null, 'semana vazia → nulls, nada inventado');

// ======================= G — calendário com R$/h e encerrado (Módulo 13) =====================
const cal = montarCalendario(2026, 8, 400, [
  { data: '2026-08-01', valor: 450, horas: 9, observacao: 'dia_encerrado' },
  { data: '2026-08-02', valor: 300, horas: null, observacao: null },
]);
check('G', cal[0].rsHora === 50 && cal[0].encerrado, 'dia completo: R$/h = 450/9 = 50 e encerrado=true');
check('G', cal[1].rsHora === null && !cal[1].encerrado, 'sem horas → R$/h null; não encerrado');
check('G', cal[2].status === 'sem_dado' && cal[2].rsHora === null, 'dia sem registro segue SEM DADO');

// ======================= H — integração com calcularMetaHoje (reuso) =========================
const hoje11 = calcularMetaHoje({
  metaMensal: 10000,
  metaDiariaOriginal: 400,
  realizadoAcumuladoAntesDeHoje: 4500,
  diasRestantesIncluindoHoje: 12,
  rendaHora: 40,
  realizadoHoje: null,
  horasTrabalhadasHoje: null,
  diaEncerrado: false,
});
check('H', aprox(hoje11.metaHoje, 458.33), 'plano de hoje usa a MESMA metaHoje do cockpit (nenhuma fórmula nova)');
check('H', aprox(horasParaValor(hoje11.metaHoje, 40), 11.458, 0.01), 'horas do plano derivam da mesma meta');

// ======================= I — fonte: reuso, vocabulário, ordem ================================
const raiz = join(new URL('.', import.meta.url).pathname, '..');
const motor = readFileSync(join(raiz, 'src/features/motorista-app/lib/metas.ts'), 'utf8');
check('I', (motor.match(/export function rebalancear/g) ?? []).length === 1, 'rebalancear continua existindo UMA vez');
check('I', /seEuPararAgora[\s\S]{0,700}rebalancear\(/.test(motor), 'seEuPararAgora REUSA rebalancear');
check('I', /simularHorasExtras[\s\S]{0,1200}rebalancear\(/.test(motor), 'simularHorasExtras REUSA rebalancear');
check('I', /metaDeAmanha[\s\S]{0,500}rebalancear\(/.test(motor), 'metaDeAmanha REUSA rebalancear');
check('I', /resumoSemana[\s\S]{0,2500}mediaRealPorHora\(/.test(motor), 'resumoSemana REUSA mediaRealPorHora');
const planoSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/PlanoDeHoje.tsx'), 'utf8');
check('I', /matematicamente/.test(planoSrc), 'linguagem "Se você ..., matematicamente ..." (Módulo 8)');
check('I', /A escolha é sua/.test(planoSrc), '"A escolha é sua" presente');
check('I', /não é garantia/i.test(planoSrc), 'histórico nunca apresentado como garantia');
check('I', /SIMULAÇÃO/.test(planoSrc) && /nada é gravado/i.test(planoSrc), 'simulações rotuladas e sem gravação');
check('I', !/deve trabalhar|deveria|recomendamos/i.test(planoSrc), 'sem "você deve trabalhar" (decisão do motorista)');
check('I', /Não é possível calcular o impacto/.test(planoSrc), 'estado sem dados do "parar agora" explícito');
const pageSrc = readFileSync(join(raiz, 'src/features/motorista-app/pages/MinhaMetaPage.tsx'), 'utf8');
check('I', pageSrc.indexOf('<HeroHoje') < pageSrc.indexOf('<PlanoDeHoje') && pageSrc.indexOf('<PlanoDeHoje') < pageSrc.indexOf('<RitmoMesCard'), 'Plano de Hoje entre o hero e o cockpit (Módulo 1)');
check('I', pageSrc.indexOf('<SemanaCard') < pageSrc.indexOf('<CalendarioMeta'), 'visão semanal antes do calendário');
const semanaSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/SemanaCard.tsx'), 'utf8');
check('I', /ESTIMATIVA/.test(semanaSrc) && /fórmula|proporcional/i.test(semanaSrc), 'meta semanal rotulada ESTIMATIVA com fórmula declarada');
const heroSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/HeroHoje.tsx'), 'utf8');
check('I', (pageSrc.match(/onEncerrarDia/g) ?? []).length === 1 && /dia_encerrado/.test(pageSrc) && /Encerrar dia/.test(heroSrc), 'Encerrar Dia continua ÚNICO (nenhum segundo fluxo — Módulo 20)');

// ======================= J — migration / performance / página única ==========================
const migs = readdirSync(join(raiz, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 47);
check('J', migs.every((f) => f.startsWith('0048')), 'ZERO migration da Fase 11 (só a 0048 do diário existe acima da 0047)');
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
check('J', fonteApp.every(({ s }) => !s.includes("from 'recharts'") && !s.includes('pdfmake') && !s.includes('fflate')), 'sem Recharts/pdfmake/fflate (Módulo 23)');
check('J', fonteApp.filter(({ s }) => /365 \/ 12|52 \/ 12/.test(s)).length === 1, 'fatores mensais continuam definidos UMA vez (Módulo 24)');
const paginas = lerTudo(join(raiz, 'src/app/router')).map((p) => readFileSync(p, 'utf8')).join('');
check('J', (paginas.match(/MinhaMetaPage/g) ?? []).length >= 2 && !/PlanoPage|OperacaoPage/.test(paginas), 'nenhuma página nova no router (mesma MinhaMetaPage lazy)');

// ======================= relatório ===========================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-motorista-plano: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
