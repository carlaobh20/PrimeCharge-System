/* eslint-disable no-console */
// Auditoria determinística da FASE 9 — Cockpit Financeiro do Motorista.
// Complementa audit-motorista-meta.ts (que segue cobrindo a fundação). Cobre: calcularMetaHoje
// (estados do dia, guards), ritmoDoMes (dias planejados × trabalhados × restantes, dias sem
// produção), rebalanceamento com os CASOS OBRIGATÓRIOS da missão (10000/25=400; 400/40=10h;
// 10000−4500=5500; 5500/12=458,33), saldoMeta, saldoHoras, projeção (mín. 3 dias — nunca
// inventa), recuperação (matemática, sem conselho), cenários, comparação mensal, alertas do
// cockpit e auditoria de duplicação/honestidade no código-fonte (Módulos 27/29/30/32).
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-motorista-cockpit.ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  alertasCockpit,
  calcularMeta,
  calcularMetaHoje,
  cenariosPredefinidos,
  compararMeses,
  formatHoras,
  opcoesRecuperacao,
  projecaoMes,
  rebalancear,
  ritmoDoMes,
  saldoHoras,
  saldoMeta,
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

// ======================= A — CASOS OBRIGATÓRIOS da missão ====================================
const metaA = calcularMeta(10000, 25, 40);
check('A', metaA.metaDiaria === 400, 'OBRIGATÓRIO: 10.000 / 25 = 400');
check('A', aprox(metaA.horasPorDia, 10), 'OBRIGATÓRIO: 400 / 40 = 10h');
check('A', 10000 - 4500 === 5500, 'OBRIGATÓRIO: 10.000 − 4.500 = 5.500');
check('A', aprox(rebalancear(10000, 4500, 12), 458.33), 'OBRIGATÓRIO: 5.500 / 12 = 458,33 (nova meta diária)');

// ======================= B — calcularMetaHoje: estados do dia ================================
const baseHoje = {
  metaMensal: 10000,
  metaDiariaOriginal: 400,
  realizadoAcumuladoAntesDeHoje: 4500,
  diasRestantesIncluindoHoje: 12,
  rendaHora: 40,
};
const semLancamento = calcularMetaHoje({ ...baseHoje, realizadoHoje: null, horasTrabalhadasHoje: null, diaEncerrado: false });
check('B', aprox(semLancamento.metaHoje, 458.33), 'meta de HOJE = rebalanceada (5.500/12 = 458,33), não a original');
check('B', semLancamento.status === 'nao_comecou', 'sem lançamento → AINDA NÃO COMEÇOU');
check('B', semLancamento.realizadoHoje === null && semLancamento.faltanteHoje === null, 'sem lançamento → SEM DADO (nada inventado)');

const noRitmo = calcularMetaHoje({ ...baseHoje, realizadoHoje: 237, horasTrabalhadasHoje: 6, diaEncerrado: false });
check('B', aprox(noRitmo.faltanteHoje, 221.33), 'faltante = meta de hoje − realizado');
check('B', noRitmo.horasRestantes != null && formatHoras(noRitmo.horasRestantes) === '5h32', 'horas restantes = faltante ÷ renda premissa');
// esperado com 6h de 11h27 necessárias ≈ 458,33 × 6/11,458 ≈ 240 → 237 está ~99% = NO RITMO
check('B', noRitmo.status === 'no_ritmo', 'realizado ≈ esperado pelas horas lançadas → NO RITMO');

const abaixo = calcularMetaHoje({ ...baseHoje, realizadoHoje: 100, horasTrabalhadasHoje: 6, diaEncerrado: false });
check('B', abaixo.status === 'abaixo_ritmo', 'bem abaixo do esperado → ABAIXO DO RITMO');
const acima = calcularMetaHoje({ ...baseHoje, realizadoHoje: 460, horasTrabalhadasHoje: 6, diaEncerrado: false });
check('B', acima.status === 'acima_ritmo', 'acima do esperado → ACIMA DO RITMO');
check('B', aprox(acima.sobreAMeta, 1.67), 'sobra do dia = realizado − meta de hoje (Módulo 14)');
const encerrado = calcularMetaHoje({ ...baseHoje, realizadoHoje: 500, horasTrabalhadasHoje: 8, diaEncerrado: true });
check('B', encerrado.status === 'encerrado', 'dia encerrado → DIA ENCERRADO (independe do valor)');
const semRitmoSemHoras = calcularMetaHoje({ ...baseHoje, realizadoHoje: 100, horasTrabalhadasHoje: null, diaEncerrado: false });
check('B', semRitmoSemHoras.status === 'abaixo_ritmo', 'sem horas lançadas, ritmo compara com o dia inteiro');

// ======================= C — guards do metaHoje ==============================================
const zeroDias = calcularMetaHoje({ ...baseHoje, diasRestantesIncluindoHoje: 0, realizadoHoje: null, horasTrabalhadasHoje: null, diaEncerrado: false });
check('C', aprox(zeroDias.metaHoje, 5500), '0 dias restantes → hoje carrega o que falta (nunca ÷0)');
const rendaZero = calcularMetaHoje({ ...baseHoje, rendaHora: 0, realizadoHoje: 100, horasTrabalhadasHoje: null, diaEncerrado: false });
check('C', rendaZero.horasRestantes === null && rendaZero.horasNecessariasHoje === null, 'renda 0 → horas null (nunca Infinity)');
const nanTudo = calcularMetaHoje({ metaMensal: NaN, metaDiariaOriginal: NaN, realizadoAcumuladoAntesDeHoje: NaN, diasRestantesIncluindoHoje: NaN, rendaHora: NaN, realizadoHoje: NaN, horasTrabalhadasHoje: NaN, diaEncerrado: false });
check('C', Number.isFinite(nanTudo.metaHoje) && nanTudo.metaHoje === 0, 'NaN em tudo → 0, nunca NaN na saída');
const negativo = calcularMetaHoje({ ...baseHoje, realizadoHoje: -50, horasTrabalhadasHoje: -3, diaEncerrado: false });
check('C', negativo.realizadoHoje === 0 && negativo.horasTrabalhadasHoje === null, 'valores negativos saneados');
const realizadoMaiorQueMeta = calcularMetaHoje({ ...baseHoje, realizadoAcumuladoAntesDeHoje: 12000, realizadoHoje: null, horasTrabalhadasHoje: null, diaEncerrado: false });
check('C', realizadoMaiorQueMeta.metaHoje === 0, 'mês já coberto → meta de hoje 0 (nunca negativa)');

// ======================= D — ritmoDoMes: dias e ritmo (Módulos 3/4) ==========================
// Exemplo da missão: 26 planejados, 14 trabalhados, ~12 restantes.
const ritmoD = ritmoDoMes({ metaMensal: 9840, metaDiariaOriginal: 378.46, realizado: 4820, diasPlanejados: 26, diasTrabalhados: 14, diaAtual: 16, diasNoMes: 30 });
check('D', ritmoD.diasPlanejados === 26 && ritmoD.diasPlanejadosDecorridos === 14, 'dia 16 de 30 → ~14 dias planejados decorridos');
check('D', ritmoD.diasRestantesPlanejados === 12, 'restam 12 dias planejados');
check('D', ritmoD.cobertura === 49, 'cobertura 4.820/9.840 = 49%');
check('D', aprox(ritmoD.metaRestanteDia, 418.33), 'meta necessária daqui pra frente ≈ 418/dia (≠ original 378)');
check('D', ritmoD.diasSemProducao === 0, '14 trabalhados de 14 decorridos → 0 dias sem produção');
const ritmoPerdido = ritmoDoMes({ metaMensal: 9840, metaDiariaOriginal: 378.46, realizado: 4000, diasPlanejados: 26, diasTrabalhados: 12, diaAtual: 16, diasNoMes: 30 });
check('D', ritmoPerdido.diasSemProducao === 2, '12 trabalhados de 14 decorridos → 2 dias sem produção (fato, sem julgamento)');
check('D', ritmoPerdido.ritmo === 'abaixo' && ritmoPerdido.deltaRitmo < 0, 'realizado < esperado → ABAIXO com delta explícito');
const ritmoAcima = ritmoDoMes({ metaMensal: 9840, metaDiariaOriginal: 378.46, realizado: 6000, diasPlanejados: 26, diasTrabalhados: 14, diaAtual: 16, diasNoMes: 30 });
check('D', ritmoAcima.ritmo === 'acima', 'realizado > esperado → ACIMA');
const ritmoSemDado = ritmoDoMes({ metaMensal: 9840, metaDiariaOriginal: 378.46, realizado: 0, diasPlanejados: 26, diasTrabalhados: 0, diaAtual: 5, diasNoMes: 30 });
check('D', ritmoSemDado.ritmo === 'sem_dado', '0 lançamentos → SEM DADO (nada inventado)');
const ritmoGuard = ritmoDoMes({ metaMensal: NaN, metaDiariaOriginal: -5, realizado: Infinity, diasPlanejados: 0, diasTrabalhados: -2, diaAtual: 99, diasNoMes: 0 });
check('D', Number.isFinite(ritmoGuard.metaRestanteDia ?? 0) && ritmoGuard.diasPlanejados === 26 && ritmoGuard.diasSemProducao >= 0, 'guards: entradas inválidas nunca produzem NaN/Infinity/negativo');
check('D', ritmoD.metaDiariaOriginal !== ritmoD.metaRestanteDia, 'meta diária ORIGINAL ≠ meta RESTANTE (conceitos separados — Módulo 3)');

// ======================= E — saldo de meta e de horas (Módulos 15/16) ========================
check('E', saldoMeta(400, [{ valor: 450 }, { valor: 480 }, { valor: 300 }]) === 30, 'exemplo da missão: +50 +80 −100 = +R$30');
check('E', saldoMeta(400, []) === 0, 'sem lançamentos → saldo 0');
check('E', saldoMeta(NaN, [{ valor: 100 }]) === 100, 'meta inválida → tratada como 0 (guard)');
const horasE = saldoHoras(10, [{ horas: 11 }, { horas: 8 }, { horas: null }]);
check('E', horasE != null && aprox(horasE.saldo, -1) && horasE.diasComHoras === 2, 'saldo de horas SÓ nos dias com horas lançadas (11+8 vs 2×10 = −1h)');
check('E', saldoHoras(10, [{ horas: null }]) === null, 'nenhum dia com horas → null (não inventa)');
check('E', saldoHoras(null, [{ horas: 8 }]) === null, 'sem horas necessárias (renda 0) → null');
const horasPos = saldoHoras(9, [{ horas: 10.33 }]);
check('E', horasPos != null && formatHoras(Math.abs(horasPos.saldo)) === '1h20', '+1h20 acima do necessário (formato do exemplo)');

// ======================= F — projeção (Módulo 22) ============================================
const projF = projecaoMes({ realizado: 4820, diasTrabalhados: 14, diasRestantesPlanejados: 12, metaMensal: 9840 });
check('F', projF != null && aprox(projF.mediaPorDiaTrabalhado, 344.29), 'média por dia trabalhado = 4.820/14');
check('F', projF != null && aprox(projF.projecao, 8951.48), 'projeção = realizado + média × dias restantes');
check('F', projF != null && projF.diferencaDaMeta < 0, 'projeção abaixo da meta → diferença negativa explícita');
check('F', projF != null && projF.formula.includes('média'), 'fórmula declarada em texto (transparência)');
check('F', projecaoMes({ realizado: 800, diasTrabalhados: 2, diasRestantesPlanejados: 20, metaMensal: 9840 }) === null, '< 3 dias → null ("Sem dados suficientes para projetar")');
check('F', projecaoMes({ realizado: NaN, diasTrabalhados: 5, diasRestantesPlanejados: NaN, metaMensal: NaN })?.projecao === 0, 'guards de NaN na projeção');

// ======================= G — recuperação (Módulo 7) ==========================================
const recG = opcoesRecuperacao({ faltaMes: 1000, metaDiariaOriginal: 378.46, diasRestantes: 2, rendaHora: 40 });
check('G', recG.length === 3, 'falta + dias restantes → 3 opções (por dia / +1 dia / horas)');
check('G', recG[0].rotulo.includes('121,54'), 'opção A: +R$121,54/dia (500 − 378,46)');
check('G', recG[1].detalhe.includes('333,33'), 'opção B: +1 dia → média 1.000/3 = 333,33');
check('G', recG[2].rotulo.includes('3h02'), 'opção C: 121,54/40 ≈ +3h02 por dia');
check('G', opcoesRecuperacao({ faltaMes: 0, metaDiariaOriginal: 400, diasRestantes: 10, rendaHora: 40 }).length === 0, 'sem falta → sem opções');
check('G', opcoesRecuperacao({ faltaMes: 500, metaDiariaOriginal: 400, diasRestantes: 0, rendaHora: 40 }).length === 0, '0 dias restantes → sem opções (nunca ÷0)');
const aconselha = /escolha|melhor|recomend|deveria|ideal/i;
check('G', recG.every((o) => !aconselha.test(o.rotulo) && !aconselha.test(o.detalhe)), 'NENHUMA opção aconselha — só matemática');

// ======================= H — cenários (Módulo 23) ============================================
const cenH = cenariosPredefinidos({ custoTotal: 9840, diasTrabalho: 26, rendaHora: 40 });
check('H', cenH.length === 5, '5 cenários prontos (+1h, +2h, +R$5/h, −10% custos, +2 dias)');
check('H', cenH.some((c) => c.rotulo === '+1h por dia' && c.impacto.includes('40,00')), '+1h/dia ≈ +R$40/dia na premissa');
const c5 = cenH.find((c) => c.rotulo.includes('+R$ 5/h'));
check('H', c5 != null && c5.impacto.includes('9h28') && c5.impacto.includes('8h25'), '+R$5/h: horas caem de 9h28 para 8h25 (matemática transparente)');
const cSemRenda = cenariosPredefinidos({ custoTotal: 9840, diasTrabalho: 26, rendaHora: 0 });
check('H', cSemRenda.length === 2 && cSemRenda.every((c) => !c.rotulo.includes('h por dia')), 'renda 0 → só cenários de custo/dias (nada inventado)');
check('H', cenH.every((c) => !aconselha.test(c.impacto)), 'cenários não recomendam — só simulam');

// ======================= I — comparação mensal (Módulo 20) ===================================
const compI = compararMeses(
  { mes: '2026-08-01', total: 9840, por_grupo: { vida: 5000, familia: 1000, carro: 3200, trabalho: 640 } },
  { mes: '2026-07-01', total: 9200, por_grupo: { vida: 5000, familia: 900, carro: 2800, trabalho: 500 } },
);
check('I', compI != null && compI.variacao === 640, 'exemplo da missão: 9.840 − 9.200 = +640');
check('I', compI != null && aprox(compI.variacaoPct, 7), '+640/9.200 ≈ +7,0%');
check('I', compI != null && compI.porGrupo.find((g) => g.grupo === 'carro')?.variacao === 400, 'variação por grupo (carro +400)');
check('I', compararMeses({ mes: '2026-08-01', total: 100, por_grupo: {} }, null) === null, 'sem mês anterior → null (sem comparação inventada)');
const compVazio = compararMeses(
  { mes: '2026-08-01', total: 100, por_grupo: { vida: 100 } },
  { mes: '2026-07-01', total: 0, por_grupo: {} },
);
check('I', compVazio != null && compVazio.variacaoPct === null, 'anterior 0 → % null (nunca Infinity)');
check('I', compVazio != null && compVazio.porGrupo.every((g) => g.grupo === 'vida' ? g.variacao === null : true), 'grupo sem dado anterior → variação null (NÃO INFORMADO)');

// ======================= J — alertas do cockpit (Módulo 21) ==================================
const ritmoAbaixoJ = ritmoDoMes({ metaMensal: 9840, metaDiariaOriginal: 378.46, realizado: 4000, diasPlanejados: 26, diasTrabalhados: 12, diaAtual: 16, diasNoMes: 30 });
const alertJ = alertasCockpit({ ritmo: ritmoAbaixoJ, objetivos: [{ nome: 'Reserva', valor_meta: 10000, valor_atual: 3000 }] });
check('J', alertJ.some((a) => a.includes('abaixo do ritmo estimado')), 'META ATRASADA: "abaixo do ritmo estimado" com o valor');
check('J', alertJ.some((a) => a.includes('R$') && a.includes('objetivo "Reserva"')), 'OBJETIVO: faltam R$7.000 para o objetivo');
const alertAcimaJ = alertasCockpit({ ritmo: ritmoDoMes({ metaMensal: 9840, metaDiariaOriginal: 378.46, realizado: 6000, diasPlanejados: 26, diasTrabalhados: 14, diaAtual: 16, diasNoMes: 30 }), objetivos: [] });
check('J', alertAcimaJ.some((a) => a.includes('acima do ritmo estimado')), 'META SUPERADA: "acima do ritmo estimado"');
check('J', alertasCockpit({ ritmo: null, objetivos: [] }).length === 0, 'sem dados → sem alertas');
const proibidoJ = /trabalhando pouco|deveria trabalhar|gastando demais|preguiç|irrespons/i;
check('J', [...alertJ, ...alertAcimaJ].every((a) => !proibidoJ.test(a)), 'NENHUM alerta usa linguagem moral/julgamento');

// ======================= K — duplicação + honestidade + performance (27/29/30/32) ============
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
const motor = readFileSync(join(raiz, 'src/features/motorista-app/lib/metas.ts'), 'utf8');
// Módulo 32 — sem segundo motor/normalização/página: a ÚNICA definição de fator mensal vive no motor
const definicoesFator = fonteApp.filter(({ s }) => /365 \/ 12|52 \/ 12|26 \/ 12/.test(s)).length;
check('K', definicoesFator === 1, 'UMA única definição dos fatores de conversão (nenhum cálculo duplicado)');
check('K', (motor.match(/export function rebalancear/g) ?? []).length === 1, 'rebalancear existe UMA vez (metaRestanteDia reusa)');
check('K', /metaRestanteDia: rebalancear\(/.test(motor), 'ritmoDoMes REUSA rebalancear (não reimplementa)');
const paginas = lerTudo(join(raiz, 'src/features/motorista-app/pages')).filter((p) => /Meta|Financ/i.test(p));
check('K', paginas.length === 1, 'UMA página de finanças (MinhaMetaPage) — nenhuma segunda tela criada');
check('K', fonteApp.every(({ s }) => !s.includes("from 'recharts'") && !s.includes('pdfmake') && !s.includes('fflate')), 'sem Recharts/pdfmake/fflate no app do motorista (Módulo 30)');
const financas = readFileSync(join(raiz, 'src/features/motorista-app/api/financasPessoais.ts'), 'utf8').replace(/\/\/.*$/gm, '');
check('K', !financas.includes("select('*')") && !financas.includes('select("*")'), "sem select('*') (Módulo 29)");
const heroSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/HeroHoje.tsx'), 'utf8');
check('K', /não é rendimento real/i.test(heroSrc), 'hero NUNCA afirma que a renda/hora é rendimento real (Módulo 1)');
check('K', /STATUS_DIA_HOJE_LABEL/.test(heroSrc) && /Icone/.test(heroSrc), 'status do dia com ícone + texto (nunca só cor — Módulo 2)');
const pageSrc = readFileSync(join(raiz, 'src/features/motorista-app/pages/MinhaMetaPage.tsx'), 'utf8');
check('K', /Não é aconselhamento financeiro/.test(pageSrc), 'rodapé "Não é aconselhamento financeiro" mantido');
check('K', /HeroHoje/.test(pageSrc.split('\n').find((l) => l.includes('<HeroHoje')) ?? '') && pageSrc.indexOf('<HeroHoje') < pageSrc.indexOf('<RitmoMesCard') && pageSrc.indexOf('<RitmoMesCard') < pageSrc.indexOf('Custo total do mês') && pageSrc.indexOf('Custo total do mês') < pageSrc.indexOf('<CarroCard') && pageSrc.indexOf('<CarroCard') < pageSrc.indexOf('<CalendarioMeta') && pageSrc.indexOf('<CalendarioMeta') < pageSrc.indexOf('Meu próximo objetivo') && pageSrc.indexOf('Meu próximo objetivo') < pageSrc.indexOf('<SimuladorESe'), 'ordem da tela segue o Módulo 26 (hoje → ritmo → custo → carro → calendário → objetivos → simulador)');
check('K', /dia_encerrado/.test(pageSrc) && /observacao/.test(motorOuHook()), 'ENCERRAR DIA reusa motorista_ganhos.observacao (zero migration)');
function motorOuHook() {
  return readFileSync(join(raiz, 'src/features/motorista-app/hooks/useMinhaMeta.ts'), 'utf8');
}
const migs = readdirSync(join(raiz, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 47);
check('K', migs.every((f) => f.startsWith('0048') || f.startsWith('0049') || f.startsWith('0050') || f.startsWith('0051') || f.startsWith('0052')), 'ZERO migration da Fase 9 (posteriores são de outras fases: 0048 diário, 0049/0050 Copiloto — Fase 16, 0051 Localização — Fase 20)');
const carroSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/CarroCard.tsx'), 'utf8');
check('K', /IMPORTADO DO CONTRATO/.test(carroSrc), 'badge IMPORTADO DO CONTRATO no card do carro (Módulo 10)');
check('K', !/lucro/i.test(carroSrc) && !/\blucro\b/i.test(heroSrc), 'nenhum "lucro" nos componentes novos');

// ======================= relatório ===========================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-motorista-cockpit: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
