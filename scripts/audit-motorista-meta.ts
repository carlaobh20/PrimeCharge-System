/* eslint-disable no-console */
// Auditoria determinística do motor "Minha Meta" (inteligência financeira pessoal do motorista).
// Complementa a suíte SQL 66 (RLS/constraints no banco). Cobre: a ÚNICA função de normalização
// mensal em todas as periodicidades, os exemplos LITERAIS da missão (R$10.000/25=R$400/dia;
// R$400/R$40=10h), guards (zero, negativo, NaN, Infinity, extremos — nunca NaN/Infinity na
// saída), rebalanceamento, meta de hoje, calendário, sobra (pode ser negativa), objetivos,
// simulador (não muta a base), alertas factuais e as regras de honestidade/arquitetura no
// código-fonte (vocabulário proibido, sem select('*'), lazy no router, RLS só do dono na 0047,
// app do motorista sem libs pesadas).
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-motorista-meta.ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  alertasMeta,
  calcularMeta,
  calcularTotais,
  diasDeTrabalhoAte,
  explicarConversao,
  formatBRL,
  formatHoras,
  metaDeHoje,
  montarCalendario,
  normalizarMensal,
  objetivoPorDia,
  progressoDoMes,
  rebalancear,
  simular,
  sobraEstimada,
  type DespesaMeta,
} from '../src/features/motorista-app/lib/metas';

let passes = 0;
let fails = 0;
const resultados: { caso: string; ok: boolean; msg: string }[] = [];
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  resultados.push({ caso, ok: cond, msg });
}
const aprox = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

// =============================== A — normalização mensal (Módulo 9) ==========================
check('A', normalizarMensal(100, 'mensal') === 100, 'mensal: 100 → 100');
check('A', aprox(normalizarMensal(1200, 'anual'), 100), 'anual: 1200 → 100/mês (1200/12)');
check('A', aprox(normalizarMensal(200, 'semanal'), 866.67), 'semanal: 200 → 866,67/mês (×52/12)');
check('A', aprox(normalizarMensal(500, 'quinzenal'), 1083.33), 'quinzenal: 500 → 1083,33/mês (×26/12)');
check('A', aprox(normalizarMensal(30, 'diaria'), 912.5), 'diária: 30 → 912,50/mês (×365/12)');
check('A', normalizarMensal(0, 'mensal') === 0, 'zero → zero');
check('A', normalizarMensal(-50, 'mensal') === 0, 'negativo → 0 (guard)');
check('A', normalizarMensal(NaN, 'semanal') === 0, 'NaN → 0 (guard)');
check('A', normalizarMensal(Infinity, 'anual') === 0, 'Infinity → 0 (guard)');
check('A', Number.isFinite(normalizarMensal(1e12, 'diaria')), 'extremo alto continua finito');
check('A', explicarConversao(100, 'mensal') === null, 'mensal não precisa de explicação');
check('A', (explicarConversao(200, 'semanal') ?? '').includes('866,67'), 'conversão explicada mostra o valor mensal');

// =============================== B — exemplos LITERAIS da missão =============================
const metaB = calcularMeta(10000, 25, 40);
check('B', metaB.metaDiaria === 400, 'OBRIGATÓRIO: R$10.000 / 25 dias = R$400,00/dia');
check('B', metaB.horasPorDia != null && aprox(metaB.horasPorDia, 10), 'OBRIGATÓRIO: R$400 / R$40/h = 10 horas/dia');
check('B', formatHoras(10) === '10h00', 'formatHoras(10) = "10h00"');
check('B', formatHoras(9.45) === '9h27', 'formatHoras(9,45) = "9h27" (fração → minutos)');
check('B', formatHoras(9.999) === '10h00', 'arredondamento de 60 minutos rola pra hora seguinte');
check('B', metaB.horasMes != null && aprox(metaB.horasMes, 250), 'horas no mês = 10 × 25 = 250');
check('B', metaB.custoPorHora != null && aprox(metaB.custoPorHora, 40), 'custo por hora trabalhada = 10000/250 = 40');

// =============================== C — guards da meta ==========================================
check('C', calcularMeta(10000, 0, 40).diasTrabalho === 26, 'dias=0 → default 26 (nunca divisão por zero)');
check('C', calcularMeta(10000, -5, 40).diasTrabalho === 26, 'dias negativo → default 26');
check('C', calcularMeta(10000, 99, 40).diasTrabalho === 31, 'dias >31 → clamp 31');
check('C', calcularMeta(10000, 26, 0).horasPorDia === null, 'renda 0 → horas null (não Infinity)');
check('C', calcularMeta(10000, 26, -10).horasPorDia === null, 'renda negativa → horas null');
check('C', calcularMeta(NaN, 26, 40).metaMensal === 0, 'custo NaN → 0');
const extremo = calcularMeta(1e12, 26, 0.01);
check('C', Number.isFinite(extremo.metaDiaria) && Number.isFinite(extremo.horasPorDia ?? 0), 'valores extremos nunca geram NaN/Infinity');
check('C', formatBRL(NaN) === formatBRL(0), 'formatBRL(NaN) não imprime NaN');

// =============================== D — totais por grupo ========================================
const despesasD: DespesaMeta[] = [
  { id: '1', grupo: 'vida', categoria: 'aluguel_casa', nome: 'Aluguel', dependente: null, valor: 1500, periodicidade: 'mensal', obrigatoria: true, ativa: true },
  { id: '2', grupo: 'familia', categoria: 'escola', nome: 'Escola', dependente: 'Filho', valor: 600, periodicidade: 'mensal', obrigatoria: true, ativa: true },
  { id: '3', grupo: 'carro', categoria: 'recarga', nome: 'Recarga', dependente: null, valor: 200, periodicidade: 'semanal', obrigatoria: true, ativa: true },
  { id: '4', grupo: 'trabalho', categoria: 'outros', nome: 'Vários', dependente: null, valor: 300, periodicidade: 'mensal', obrigatoria: false, ativa: true },
  { id: '5', grupo: 'vida', categoria: 'lazer', nome: 'Pausada', dependente: null, valor: 999, periodicidade: 'mensal', obrigatoria: false, ativa: false },
  { id: '6', grupo: 'carro', categoria: 'ipva', nome: 'IPVA', dependente: null, valor: 1200, periodicidade: 'anual', obrigatoria: true, ativa: true },
];
const totaisD = calcularTotais(despesasD, 6066.67); // aluguel do contrato: 1400/semana ×52/12
check('D', aprox(totaisD.vida, 1500), 'vida: só a ativa entra (pausada de 999 fica fora)');
check('D', aprox(totaisD.familia, 600), 'família somada separada');
check('D', aprox(totaisD.carro, 6066.67 + 866.67 + 100), 'carro = aluguel derivado do CONTRATO + recarga semanal + IPVA/12');
check('D', aprox(totaisD.trabalho, 300), 'trabalho somado');
check('D', aprox(totaisD.total, totaisD.vida + totaisD.familia + totaisD.carro + totaisD.trabalho), 'total = soma dos grupos');
check('D', aprox(totaisD.anuaisBruto, 1200), 'despesas anuais brutas rastreadas p/ alerta de provisionamento');
check('D', aprox(totaisD.outrosMensal, 300), 'categoria "outros" rastreada p/ prompt de detalhamento');
check('D', calcularTotais([], 0).total === 0, 'sem nada cadastrado → 0 (nunca inventa)');
check('D', calcularTotais([], NaN).total === 0, 'aluguel NaN → 0 (guard)');

// =============================== E — progresso + rebalanceamento =============================
const progE = progressoDoMes(9840, [{ valor: 400 }, { valor: 380 }, { valor: 500 }]);
check('E', aprox(progE.realizado, 1280), 'realizado = soma dos lançamentos manuais');
check('E', progE.pctCoberto === 13, '% coberto arredondado (1280/9840 → 13%)');
check('E', aprox(progE.falta, 8560), 'falta nunca negativa');
check('E', progressoDoMes(0, []).pctCoberto === 0, 'meta 0 → 0% (não NaN)');
check('E', progressoDoMes(1000, [{ valor: 1500 }]).falta === 0, 'realizado acima da meta → falta 0');
check('E', progressoDoMes(1000, [{ valor: 1500 }]).pctCoberto === 150, 'pode passar de 100% (fato, não julgamento)');
const rebE = rebalancear(9840, 4500, 12);
check('E', rebE != null && aprox(rebE, 445), 'rebalancear(9840, 4500, 12) = 445/dia');
check('E', rebalancear(9840, 4500, 0) === null, '0 dias restantes → null (nunca Infinity)');
check('E', rebalancear(9840, 12000, 5) === 0, 'meta já batida → nova média 0');

// =============================== F — meta de hoje ============================================
check('F', metaDeHoje(400, null, 40).realizado === null, 'sem lançamento hoje → realizado null (nada inventado)');
check('F', metaDeHoje(400, null, 40).falta === null, 'sem lançamento → sem falta calculada');
const hojeF = metaDeHoje(400, 250, 40);
check('F', hojeF.falta === 150 && hojeF.horasRestantes != null && aprox(hojeF.horasRestantes, 3.75), 'falta 150 → 3,75h restantes na premissa de R$40/h');
check('F', metaDeHoje(400, 500, 40).falta === 0, 'dia batido → falta 0 (não negativa)');
check('F', metaDeHoje(400, 250, 0).horasRestantes === null, 'renda 0 → horas null');

// =============================== G — calendário ==============================================
const calG = montarCalendario(2026, 8, 400, [
  { data: '2026-08-01', valor: 400, horas: 9 },
  { data: '2026-08-02', valor: 500, horas: null },
  { data: '2026-08-03', valor: 200, horas: 8 },
]);
check('G', calG.length === 31, 'agosto tem 31 dias');
check('G', calG[0].status === 'atingida', 'realizado = meta → ATINGIDA');
check('G', calG[1].status === 'acima' && calG[1].diferenca === 100, 'acima com diferença explícita');
check('G', calG[2].status === 'abaixo' && calG[2].diferenca === -200, 'abaixo com diferença negativa');
check('G', calG[3].status === 'sem_dado' && calG[3].realizado === null, 'dia sem lançamento = SEM DADO (nunca zero falso)');
check('G', montarCalendario(2026, 2, 400, []).length === 28, 'fevereiro/2026 tem 28 dias');
check('G', calG.every((d) => Number.isFinite(d.meta)), 'nenhum dia com meta NaN');

// =============================== H — sobra + objetivos =======================================
check('H', sobraEstimada(12000, 9840) === 2160, 'sobra estimada positiva');
check('H', sobraEstimada(8000, 9840) === -1840, 'sobra NEGATIVA é permitida e mostrada como está');
check('H', sobraEstimada(NaN, 9840) === -9840, 'receita inválida → tratada como 0');
const objH = objetivoPorDia(5000, 500, 90);
check('H', objH != null && aprox(objH, 50), 'objetivo: falta 4500 em 90 dias = R$50 ADICIONAIS/dia');
check('H', objetivoPorDia(5000, 500, 0) === null, '0 dias → null (nunca Infinity)');
check('H', objetivoPorDia(5000, 6000, 30) === 0, 'objetivo já atingido → 0/dia');
const diasH = diasDeTrabalhoAte('2026-09-19', 26, new Date('2026-08-20T12:00:00'));
check('H', diasH != null && diasH >= 24 && diasH <= 28, 'prazo em 30 dias corridos ≈ 26 dias de trabalho');
check('H', diasDeTrabalhoAte('2026-08-01', 26, new Date('2026-08-20T12:00:00')) === null, 'prazo no passado → null');
check('H', diasDeTrabalhoAte(null, 26, new Date()) === null, 'sem prazo → null');

// =============================== I — simulador não muta a base ===============================
const baseI = { custoTotal: 9840, diasTrabalho: 26, rendaHora: 40 };
const congelada = JSON.stringify(baseI);
const simI = simular(baseI, { diasTrabalho: 22 });
check('I', JSON.stringify(baseI) === congelada, 'simular() NÃO altera o objeto base');
check('I', aprox(simI.atual.metaDiaria, 378.46), 'cenário atual preservado');
check('I', aprox(simI.simulado.metaDiaria, 447.27), 'cenário simulado com 22 dias');
check('I', simI.diferencaDiaria > 0, 'menos dias → mais por dia (diferença explícita)');
check('I', simular(baseI, {}).diferencaDiaria === 0, 'sem ajuste → diferença zero');

// =============================== J — alertas factuais ========================================
const alertJ = alertasMeta({ totais: totaisD, progresso: progressoDoMes(9840, [{ valor: 400 }]), snapshotAnteriorTotal: totaisD.total - 300, diasRestantes: 5 });
check('J', alertJ.some((a) => a.includes('%')), 'alerta de composição carro+trabalho em %');
const alertOutros = alertasMeta({
  totais: { vida: 500, familia: 0, carro: 300, trabalho: 0, total: 1000, anuaisBruto: 0, outrosMensal: 200 },
  progresso: null,
  snapshotAnteriorTotal: null,
  diasRestantes: 20,
});
check('J', alertOutros.some((a) => a.includes('Outros')), 'alerta de "Outros" ≥10% com convite a detalhar');
check('J', alertJ.every((a) => !a.includes('Outros')), '"Outros" abaixo de 10% NÃO gera alerta');
check('J', alertJ.some((a) => a.includes('anuais')), 'alerta de despesas anuais provisionadas');
check('J', alertJ.some((a) => a.includes('abaixo da meta')), 'alerta factual de meta com ≤7 dias restantes');
check('J', alertJ.some((a) => a.includes('aumentou')), 'alerta de variação de custo ≥R$50 vs mês anterior');
const proibidoJ = /devia|deveria|corte|economize|gaste menos|irrespons|ruim|péssim/i;
check('J', alertJ.every((a) => !proibidoJ.test(a)), 'NENHUM alerta julga ou aconselha — só fatos');
check('J', alertasMeta({ totais: calcularTotais([], 0), progresso: null, snapshotAnteriorTotal: null, diasRestantes: 20 }).length === 0, 'sem dados → sem alertas (nada inventado)');

// =============================== K — honestidade no código-fonte =============================
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
const arquivosApp = lerTudo(join(raiz, 'src/features/motorista-app'));
const fonteApp = arquivosApp.map((p) => ({ p, s: readFileSync(p, 'utf8') }));

// vocabulário proibido (fora de linhas que o proíbem/negam)
const proibidos = [/\blucro\b/i, /aconselhamento financeiro(?! )/i, /faturamento l[ií]quido/i, /renda real/i];
let vocabOk = true;
for (const { p, s } of fonteApp) {
  for (const [i, linha] of s.split('\n').entries()) {
    if (/nunca|não é|nao é|NÃO|proibid|jamais|nada aqui é/i.test(linha)) continue;
    for (const re of proibidos) {
      if (re.test(linha)) {
        vocabOk = false;
        console.error(`   vocabulário proibido em ${p}:${i + 1}: ${linha.trim()}`);
      }
    }
  }
}
check('K', vocabOk, 'app do motorista NUNCA usa "lucro"/"renda real"/"faturamento líquido" como afirmação');
const financas = readFileSync(join(raiz, 'src/features/motorista-app/api/financasPessoais.ts'), 'utf8');
const financasSemComentario = financas.replace(/\/\/.*$/gm, '');
check('K', !financasSemComentario.includes("select('*')") && !financasSemComentario.includes('select("*")'), "financasPessoais.ts sem select('*') (R4 — colunas explícitas)");
check('K', fonteApp.every(({ s }) => !s.includes("from 'recharts'") && !s.includes('pdfmake')), 'app do motorista NÃO importa Recharts/pdfmake (Módulo 35)');
// Os arquivos NOVOS da Minha Meta não podem tocar o Centro Jurídico (o contrato do motorista já
// tinha markdown/types importados em telas anteriores — leves e pré-existentes, fora do escopo).
const arquivosMeta = fonteApp.filter(({ p }) => /minhameta|minha-meta|\/meta\/|financasPessoais|lib\/metas/i.test(p));
check('K', arquivosMeta.length >= 7, 'varredura encontrou os arquivos da Minha Meta');
check('K', arquivosMeta.every(({ s }) => !/features\/contracts\/juridico/.test(s)), 'Minha Meta NÃO importa nada do Centro Jurídico (Módulo 1 — jurídico não recebe features novas)');
const pageMeta = readFileSync(join(raiz, 'src/features/motorista-app/pages/MinhaMetaPage.tsx'), 'utf8')
  + readFileSync(join(raiz, 'src/features/motorista-app/components/meta/HeroHoje.tsx'), 'utf8');
check('K', /renda média informada|não é rendimento real/.test(pageMeta), 'disclaimer de estimativa presente na tela (página ou hero)');
check('K', /Não é aconselhamento financeiro/.test(pageMeta), 'rodapé "Não é aconselhamento financeiro" presente');

// =============================== L — arquitetura: rota lazy + RLS 0047 =======================
const router = readFileSync(join(raiz, 'src/app/router/router.tsx'), 'utf8');
check('L', /MinhaMetaPage = named\(\(\) => import\(/.test(router), 'MinhaMetaPage é LAZY no router');
check('L', /path: 'meta', element: <MinhaMetaPage \/>/.test(router), "rota /motorista/meta registrada");
const layout = readFileSync(join(raiz, 'src/features/motorista-app/components/AppLayoutMotorista.tsx'), 'utf8');
check('L', /\/motorista\/meta/.test(layout), 'aba "Meta" na navegação do motorista');
const mig = readFileSync(join(raiz, 'supabase/migrations/0047_motorista_financas_pessoais.sql'), 'utf8');
check('L', /current_motorista_id\(\)/.test(mig), '0047: RLS baseada em current_motorista_id()');
check('L', !/eh_staff/.test(mig), '0047: NENHUMA policy de staff (privacidade — Módulo 33)');
check('L', !/audit_log/i.test(mig.replace(/--.*$/gm, '')), '0047: sem trigger de audit_log (comentário explica o porquê)');
check('L', /NÃO APLICADA EM PRODUÇÃO/.test(mig), '0047: aviso de não aplicada em produção no cabeçalho');
const migs = readdirSync(join(raiz, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 47);
check('L', migs.every((f) => f.startsWith('0048') || f.startsWith('0049') || f.startsWith('0050') || f.startsWith('0051') || f.startsWith('0052')), 'acima da 0047: 0048 (diário — Fase 12.1), 0049/0050 (Copiloto — Fase 16), 0051 (Localização — Fase 20)');

// =============================== relatório ===================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-motorista-meta: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
