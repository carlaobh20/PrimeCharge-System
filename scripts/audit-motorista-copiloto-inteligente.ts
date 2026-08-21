/* eslint-disable no-console */
// Auditoria determinística da FASE 17 — Copiloto Inteligente do Motorista.
// Cobre os Módulos A/B/C/D/E/F/G/H desta passada (histórico por período, por horário, por dia da
// semana, insights automáticos, qualidade da base, conexão com a meta, configurações). Módulos
// I/J/K (cenários estendidos, plano estendido, assistente Q&A) ficam para a próxima passada —
// decisão registrada em claude/auditoria-fase17-copiloto-inteligente.md, seção 0.
// CASOS OBRIGATÓRIOS: período de 7d com 1 corrida de R$100/10km/60min ⇒ R$10/km e R$100/h.
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-motorista-copiloto-inteligente.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  classificarAmostra,
  compararPeriodoCorridas,
  inteligenciaPorDiaSemana,
  inteligenciaPorHorario,
  insightsCopiloto,
  qualidadeBaseCopiloto,
  resumoPeriodoCorridas,
  type CorridaHistorico,
  type MetaHojeCockpit,
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

const c = (p: Partial<CorridaHistorico> & { data: string; valor: number }): CorridaHistorico => ({
  hora: null,
  app: null,
  kmEstimado: null,
  duracaoEstimadaMin: null,
  ...p,
});

// ======================= 1 — CASO OBRIGATÓRIO: resumoPeriodoCorridas ==========================
const c1 = [c({ data: '2026-08-21', valor: 100, kmEstimado: 10, duracaoEstimadaMin: 60 })];
const r1 = resumoPeriodoCorridas(c1, 7, '2026-08-21');
check('1', r1.qtdCorridas === 1 && r1.valorTotal === 100, 'OBRIGATÓRIO: 1 corrida de R$100 → valorTotal=100, qtd=1');
check('1', aprox(r1.rpKm, 10), 'OBRIGATÓRIO: R$100 / 10km = R$10/km');
check('1', aprox(r1.rpHora, 100), 'OBRIGATÓRIO: R$100 / 60min (1h) = R$100/h');
check('1', r1.valorMedioPorCorrida === 100, 'valor médio por corrida = valor total quando só há 1 corrida');

// ======================= 2 — resumoPeriodoCorridas: guards (dado ausente nunca vira zero) ======
const c2 = [c({ data: '2026-08-21', valor: 50 })]; // sem km, sem duração
const r2 = resumoPeriodoCorridas(c2, 7, '2026-08-21');
check('2', r2.rpKm === null, 'sem km estimado em NENHUMA corrida → rpKm null (nunca 0)');
check('2', r2.rpHora === null, 'sem duração em NENHUMA corrida → rpHora null (nunca 0)');
check('2', r2.kmEstimadoTotal === null && r2.horasEstimadasTotal === null, 'totais de km/horas ficam null, não zero, quando ninguém informou');

const r2vazio = resumoPeriodoCorridas([], 30, '2026-08-21');
check('2', r2vazio.qtdCorridas === 0 && r2vazio.valorTotal === 0 && r2vazio.valorMedioPorCorrida === null,
  'sem NENHUMA corrida no período → 0 corridas, R$0 total, média null (nunca inventada)');

// ======================= 3 — compararPeriodoCorridas: comparação real ==========================
const c3atual = [c({ data: '2026-08-21', valor: 100, kmEstimado: 10, duracaoEstimadaMin: 60 })];
const c3anterior = [c({ data: '2026-08-10', valor: 50, kmEstimado: 10, duracaoEstimadaMin: 60 })];
const comp3 = compararPeriodoCorridas([...c3atual, ...c3anterior], 7, '2026-08-21');
check('3', comp3.anterior != null, 'com corrida no período anterior → comparação existe (não é null)');
check('3', comp3.anterior?.valorTotal === 50, 'período anterior (Aug08–Aug14) captura a corrida de Aug10');
const campoValor3 = comp3.campos?.find((f) => f.rotulo === 'Valor total');
check('3', aprox(campoValor3?.variacaoPct, 100), 'R$100 vs. R$50 anterior = +100% (fórmula reaproveitada de campoEvolucao)');

// ======================= 4 — compararPeriodoCorridas: SEM COMPARAÇÃO ===========================
const comp4 = compararPeriodoCorridas(c1, 7, '2026-08-21'); // só corrida de hoje, nada no período anterior
check('4', comp4.anterior === null && comp4.campos === null, 'sem NENHUMA corrida no período anterior → comparação null (SEM COMPARAÇÃO, nunca delta contra zero)');

// ======================= 5 — distribuição por app ===============================================
const c5 = [
  c({ data: '2026-08-21', valor: 30, app: 'Uber' }),
  c({ data: '2026-08-20', valor: 20, app: 'Uber' }),
  c({ data: '2026-08-19', valor: 10, app: '99' }),
  c({ data: '2026-08-18', valor: 5 }), // sem app
];
const r5 = resumoPeriodoCorridas(c5, 7, '2026-08-21');
check('5', r5.distribuicaoPorApp.reduce((s, a) => s + a.valorTotal, 0) === 65, 'soma da distribuição por app bate com o valor total (30+20+10+5)');
check('5', r5.distribuicaoPorApp.find((a) => a.app === 'Uber')?.qtd === 2, 'Uber agrega as 2 corridas corretamente');
check('5', r5.distribuicaoPorApp.some((a) => a.app === 'Não informado'), 'app ausente vira "Não informado", nunca descartado silenciosamente');

// ======================= 6 — inteligenciaPorHorario: agrupamento por faixa fixa ================
const c6 = [
  c({ data: '2026-08-21', hora: '05:30', valor: 10, kmEstimado: 5, duracaoEstimadaMin: 15 }),
  c({ data: '2026-08-20', hora: '05:45', valor: 20, kmEstimado: 10, duracaoEstimadaMin: 15 }),
  c({ data: '2026-08-19', hora: '07:00', valor: 15 }), // banda diferente (06-09), sem km/duração
  c({ data: '2026-08-18', valor: 999 }), // sem hora — deve ser IGNORADA (horário nunca inventado)
];
const r6 = inteligenciaPorHorario(c6);
const banda0006 = r6.find((f) => f.label === '00h–06h');
const banda0609 = r6.find((f) => f.label === '06h–09h');
check('6', banda0006 != null && banda0006.qtdCorridas === 2, 'faixa 00h–06h agrupa as 2 corridas de 05:30 e 05:45');
check('6', aprox(banda0006?.valorMedioPorCorrida, 15), 'valor médio da faixa 00h–06h = (10+20)/2 = 15');
check('6', banda0609 != null && banda0609.qtdCorridas === 1, 'faixa 06h–09h isola a corrida de 07:00');
check('6', banda0609?.rpKm === null && banda0609?.rpHora === null, 'corrida sem km/duração na faixa não gera R$/km ou R$/h inventados');
check('6', r6.reduce((s, f) => s + f.qtdCorridas, 0) === 3, 'corrida SEM hora é excluída da contagem total (nunca inventa horário)');

// ======================= 7 — inteligenciaPorHorario: faixa de fronteira (21h–00h) ===============
const c7 = [c({ data: '2026-08-21', hora: '23:45', valor: 40, kmEstimado: 20, duracaoEstimadaMin: 40 })];
const r7 = inteligenciaPorHorario(c7);
check('7', r7.some((f) => f.label === '21h–00h' && f.qtdCorridas === 1), 'corrida às 23:45 cai na faixa 21h–00h (fronteira superior)');

// ======================= 8 — classificarAmostra: limiares 3/7/14 ================================
check('8', classificarAmostra(0) === 'dados_insuficientes', '0 observações → dados_insuficientes');
check('8', classificarAmostra(2) === 'dados_insuficientes', '2 observações → dados_insuficientes (< 3)');
check('8', classificarAmostra(3) === 'base_inicial', '3 observações → base_inicial (limiar exato)');
check('8', classificarAmostra(6) === 'base_inicial', '6 observações → ainda base_inicial');
check('8', classificarAmostra(7) === 'base_consistente', '7 observações → base_consistente (limiar exato)');
check('8', classificarAmostra(13) === 'base_consistente', '13 observações → ainda base_consistente');
check('8', classificarAmostra(14) === 'base_relevante', '14 observações → base_relevante (limiar exato)');
check('8', classificarAmostra(100) === 'base_relevante', '100 observações → base_relevante');

// ======================= 9 — inteligenciaPorDiaSemana: agrupamento correto ======================
// Duas datas exatamente 7 dias de distância caem SEMPRE no mesmo dia da semana — teste não depende
// de saber de cor qual dia da semana é 21/08/2026.
const c9 = [
  c({ data: '2026-08-07', valor: 40, kmEstimado: 10, duracaoEstimadaMin: 30 }),
  c({ data: '2026-08-14', valor: 60, kmEstimado: 10, duracaoEstimadaMin: 30 }),
  c({ data: '2026-08-08', valor: 999 }), // dia da semana diferente — não deve entrar no mesmo grupo
];
const r9 = inteligenciaPorDiaSemana(c9);
const grupoComDuas = r9.find((g) => g.qtdCorridas === 2);
check('9', grupoComDuas != null, 'as duas corridas de 07/08 e 14/08 (mesma semana, 7 dias de distância) caem no MESMO grupo de dia da semana');
check('9', grupoComDuas != null && aprox(grupoComDuas.valorMedioPorCorrida, 50), 'valor médio do grupo = (40+60)/2 = 50');
check('9', r9.some((g) => g.qtdCorridas === 1 && g.valorMedioPorCorrida === 999), 'a corrida de 08/08 (dia da semana diferente) fica em outro grupo, isolada');

// ======================= 10 — qualidadeBaseCopiloto: descritivo, nunca julga ====================
const c10 = [
  c({ data: '2026-08-21', valor: 10, kmEstimado: 5, duracaoEstimadaMin: 15, hora: '08:00', app: 'Uber' }),
  c({ data: '2026-08-20', valor: 20 }), // sem km/duração/hora/app
];
const r10 = qualidadeBaseCopiloto(c10);
check('10', r10.totalCorridas === 2 && r10.comKm === 1 && r10.semKm === 1, 'contadores comKm/semKm batem (1 de 2 tem km)');
check('10', r10.comDuracao === 1 && r10.semDuracao === 1, 'contadores comDuracao/semDuracao batem');
check('10', r10.comHorario === 1 && r10.semHorario === 1, 'contadores comHorario/semHorario batem');
check('10', r10.comApp === 1 && r10.semApp === 1, 'contadores comApp/semApp batem');
check('10', r10.diasComRegistro === 2, 'dias distintos com registro contados corretamente');
const raizFonte = join(new URL('.', import.meta.url).pathname, '..');
const motorSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/lib/metas.ts'), 'utf8');
const trechoQualidade = motorSrc.slice(motorSrc.indexOf('export function qualidadeBaseCopiloto'), motorSrc.indexOf('export function qualidadeBaseCopiloto') + 900);
check('10', !/\bruim\b|\bboa\b|\bótima\b|\bpéssima\b/i.test(trechoQualidade.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')),
  'qualidadeBaseCopiloto nunca usa vocabulário de julgamento no corpo da função (só descreve contadores)');

// ======================= 11 — insightsCopiloto: sem NENHUMA corrida ============================
const ins11 = insightsCopiloto({ corridas: [], ateIso: '2026-08-21' });
check('11', ins11.length === 1 && ins11[0].tipo === 'DADO_INSUFICIENTE', 'zero corridas → só o insight DADO_INSUFICIENTE, nada mais inventado');
check('11', ins11[0].origem === 'SEM DADOS SUFICIENTES' && ins11[0].dadosBase === 0, 'origem e dadosBase corretos quando não há dado');

// ======================= 12 — insightsCopiloto: tipos esperados presentes ======================
const corridasFull: CorridaHistorico[] = [
  c({ data: '2026-08-21', hora: '08:00', app: 'Uber', valor: 100, kmEstimado: 10, duracaoEstimadaMin: 60 }),
  c({ data: '2026-08-20', hora: '08:15', app: 'Uber', valor: 90, kmEstimado: 9, duracaoEstimadaMin: 60 }),
  c({ data: '2026-08-19', hora: '08:30', app: '99', valor: 80 }), // sem km/duração — alimenta o Módulo REGISTRO
  c({ data: '2026-07-05', hora: '08:00', valor: 20, kmEstimado: 5, duracaoEstimadaMin: 30 }), // período anterior (30d)
];
const metaHojeFixture: MetaHojeCockpit = {
  metaHoje: 200,
  metaDiariaOriginal: 200,
  realizadoHoje: 150,
  faltanteHoje: 50,
  horasRestantes: null,
  horasNecessariasHoje: null,
  horasTrabalhadasHoje: null,
  sobreAMeta: -50,
  pctDia: 75,
  status: 'abaixo_ritmo',
};
const ins12 = insightsCopiloto({ corridas: corridasFull, ateIso: '2026-08-21', periodo: 30, metaHoje: metaHojeFixture, qtdCorridasHoje: 1 });
const tipos12 = new Set(ins12.map((i) => i.tipo));
check('12', tipos12.has('EVOLUCAO'), 'insight EVOLUCAO presente quando há corridas no período');
check('12', tipos12.has('HORARIO'), 'insight HORARIO presente (há corridas com hora informada)');
check('12', tipos12.has('DIA_SEMANA'), 'insight DIA_SEMANA presente (há corridas em dias com base suficiente ou aviso de dados insuficientes)');
check('12', tipos12.has('RPH') && tipos12.has('RPKM'), 'insights RPH e RPKM presentes (há corridas com km e duração)');
check('12', tipos12.has('META'), 'insight META presente quando metaHoje é passada');
check('12', tipos12.has('CORRIDA'), 'insight CORRIDA presente quando qtdCorridasHoje > 0');
check('12', tipos12.has('REGISTRO'), 'insight REGISTRO presente quando alguma corrida está sem km/duração');

// ======================= 13 — vocabulário proibido (nunca ordena, nunca julga, nunca promete) ===
const proibido = /\bvocê deve\b|\bvocê precisa\b|\baceite\b|\brecuse\b|\bindo mal\b|\bindo bem\b|renda garantida|\bmelhor horário\b|\bmelhor dia\b|\bmelhor região\b|\bdeveria trabalhar\b|\bgarantid[oa]\b/i;
const todosTextosInsights = ins12.flatMap((i) => [i.titulo, i.descricao]).concat(ins11.flatMap((i) => [i.titulo, i.descricao]));
check('13', todosTextosInsights.every((t) => !proibido.test(t)), 'nenhum insight usa linguagem de ordem, julgamento categórico ("melhor horário/dia") ou promessa de renda');

// ======================= 14 — "maior média REGISTRADA", nunca "melhor" =========================
const insightHorario12 = ins12.find((i) => i.tipo === 'HORARIO');
check('14', insightHorario12 != null && /registrad/i.test(insightHorario12.titulo + insightHorario12.descricao), 'insight de horário usa "registrada", não "melhor" ou "recomendado"');
check('14', insightHorario12 != null && !/melhor/i.test(insightHorario12.titulo), 'título do insight de horário nunca contém "melhor"');

// ======================= 15 — reuso: calcularRpKm/calcularRph nunca reimplementados ============
const trechoResumo = motorSrc.slice(motorSrc.indexOf('export function resumoPeriodoCorridas'), motorSrc.indexOf('export type ComparacaoPeriodoCorridas'));
check('15', /calcularRpKm\(valorTotal/.test(trechoResumo), 'resumoPeriodoCorridas REUSA calcularRpKm (nunca valorTotal/km inline)');
check('15', /calcularRph\(valorTotal/.test(trechoResumo), 'resumoPeriodoCorridas REUSA calcularRph');
check('15', !/valorTotal\s*\/\s*kmEstimadoTotal/.test(trechoResumo) && !/valorTotal\s*\/\s*horasEstimadasTotal/.test(trechoResumo),
  'nenhuma divisão manual de valorTotal por km/horas fora das funções do motor');

// ======================= 16 — reuso: campoEvolucao reaproveitado em compararPeriodoCorridas =====
const trechoComparar = motorSrc.slice(motorSrc.indexOf('export function compararPeriodoCorridas'), motorSrc.indexOf('export function compararPeriodoCorridas') + 900);
check('16', (trechoComparar.match(/campoEvolucao\(/g) ?? []).length >= 5, 'compararPeriodoCorridas REUSA campoEvolucao (mesmo formato de variação da Fase 12.2), não reinventa um novo formato de delta');

// ======================= 17 — ZERO migration nova (prefer ZERO, provado) =======================
const migs17 = readdirSync(join(raizFonte, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 48);
check('17', migs17.every((f) => f.startsWith('0049') || f.startsWith('0050')), 'acima da 0048 só existem 0049 e 0050 — Fase 17 não criou NENHUMA migration nova');

// ======================= 18 — RLS de 0049/0050 inalterada (zero policy nova) ====================
const mig49Src = readFileSync(join(raizFonte, 'supabase/migrations/0049_motorista_corridas.sql'), 'utf8');
const mig50Src = readFileSync(join(raizFonte, 'supabase/migrations/0050_motorista_config_copiloto.sql'), 'utf8');
check('18', (mig49Src.match(/create policy/g) ?? []).length === 1, '0049 continua com exatamente 1 policy (dono total) — Fase 17 não adicionou policy nova');
check('18', (mig50Src.match(/create policy/g) ?? []).length === 1, '0050 continua com exatamente 1 policy (dono total)');

// ======================= 19 — hook: zero query nova (mesma janela de 90 dias reaproveitada) =====
const hookSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/hooks/useMinhaMeta.ts'), 'utf8');
const trechoPromiseAll = hookSrc.slice(hookSrc.indexOf('Promise.all(['), hookSrc.indexOf(']);', hookSrc.indexOf('Promise.all([')));
check('19', (trechoPromiseAll.match(/list\w+\(|get\w+\(/g) ?? []).length === 11,
  'Promise.all da query base continua com as MESMAS 11 chamadas — Fase 17 não adicionou fetch novo ao Supabase');
check('19', /corridasHistorico[\s\S]{0,200}corridas60\.map/.test(hookSrc), 'corridasHistorico é derivado por MAP client-side de corridas60 (a mesma janela já buscada), não uma nova query');

// ======================= 20 — UI: componentes novos sem vocabulário proibido ====================
const copilotoCardSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/components/meta/CopilotoCard.tsx'), 'utf8');
const copilotoIntelSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/components/meta/CopilotoInteligenteCard.tsx'), 'utf8');
const textosJsxProibidos = /melhor horário para trabalhar|melhor dia para trabalhar|você deve trabalhar|renda garantida/i;
check('20', !textosJsxProibidos.test(copilotoCardSrc), 'CopilotoCard.tsx não usa vocabulário proibido nos textos fixos');
check('20', !textosJsxProibidos.test(copilotoIntelSrc), 'CopilotoInteligenteCard.tsx não usa vocabulário proibido nos textos fixos');
check('20', /Maiores médias REGISTRADAS/.test(copilotoIntelSrc), 'UI de padrões usa explicitamente "REGISTRADAS", reforçando que é leitura do passado');

// ======================= 21 — Módulo H: peso nunca pode ser 0 ao salvar =========================
check('21', /peso_rpkm:[\s\S]{0,80}> 0[\s\S]{0,60}: 1/.test(copilotoCardSrc), 'salvarConfig faz fallback para peso=1 quando o campo não é um número > 0 (nunca envia peso 0)');
check('21', /peso_rph:[\s\S]{0,80}> 0[\s\S]{0,60}: 1/.test(copilotoCardSrc), 'idem para peso_rph');

// ======================= 22 — Módulo H: limiar vazio salva null, não zero =======================
check('22', /limiar_rpkm_bom: num\(cf\.limiarRpkmBom\)/.test(copilotoCardSrc), 'limiar vazio passa por num() (retorna null em string vazia) — nunca vira 0 no INSERT/UPDATE');
const numFnSrc = copilotoCardSrc.slice(copilotoCardSrc.indexOf('const num = '), copilotoCardSrc.indexOf('const num = ') + 200);
check('22', /s\.trim\(\) !== ''/.test(numFnSrc), 'num() checa string vazia explicitamente antes de converter — campo vazio nunca vira Number("") = 0');

// ======================= relatório ================================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-motorista-copiloto-inteligente: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
