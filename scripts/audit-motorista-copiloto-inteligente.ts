/* eslint-disable no-console */
// Auditoria determinística da FASE 17 — Copiloto Inteligente do Motorista (passada de
// reconciliação com a auditoria de reuso). Cobre os Módulos A/B/C/D/E/F/G/H (histórico por
// período, por horário, por dia da semana, insights automáticos, qualidade da base, conexão com
// a meta, configurações). Módulos I/J/K (cenários estendidos, plano estendido, assistente Q&A)
// ficam para a próxima passada — decisão registrada na auditoria da fase, seção 0.
// 26 categorias numeradas, cada uma testando um comportamento exigido pela especificação:
//   1-4  histórico por período (7/14/30/90d)           14 impacto de corrida registrada
//   5    comparação com período anterior                15 insights automáticos (tipos)
//   6    denominador zero / SEM COMPARAÇÃO               16 qualidade da base
//   7    inteligência por horário                        17 configuração (Módulo H)
//   8    inteligência por dia da semana                  18 ausência de dados
//   9    amostra: dados_insuficientes                     19 NaN nunca produzido
//   10   amostra: base_inicial                            20 Infinity nunca produzido
//   11   amostra: base_consistente                        21 divisão por zero
//   12   amostra: base_relevante                          22 imutabilidade
//   13   meta (Módulo D — zero motor novo)                23 reuso das funções existentes
//                                                          24 ausência de query nova
//                                                          25 ausência de migration
//                                                          26 vocabulário proibido
// FIXTURES OBRIGATÓRIAS: 1000/20h=R$50/h · 1000/200km=R$5/km · 1000/10corridas=R$100/corrida ·
// 1160 vs 1000 anterior ⇒ Δ=+160 / Δ%=+16%.
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-motorista-copiloto-inteligente.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  calcularRpKm,
  calcularRph,
  classificarAmostra,
  compararPeriodoCorridas,
  historicoPorPeriodo,
  horasParaValor,
  inteligenciaPorDiaSemana,
  inteligenciaPorHorario,
  insightsCopiloto,
  qualidadeBaseCopiloto,
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

const raizFonte = join(new URL('.', import.meta.url).pathname, '..');
const motorSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/lib/metas.ts'), 'utf8');
const hookSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/hooks/useMinhaMeta.ts'), 'utf8');
const copilotoCardSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/components/meta/CopilotoCard.tsx'), 'utf8');
const copilotoIntelSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/components/meta/CopilotoInteligenteCard.tsx'), 'utf8');
const copilotoHistSrc = readFileSync(join(raizFonte, 'src/features/motorista-app/components/meta/CopilotoHistoricoCard.tsx'), 'utf8');

// ======================= FIXTURES OBRIGATÓRIAS (isoladas, direto nas funções REUSADAS) =========
check('fixture', aprox(calcularRph(1000, 20), 50), 'OBRIGATÓRIO: R$1000 / 20h = R$50/h');
check('fixture', aprox(calcularRpKm(1000, 200), 5), 'OBRIGATÓRIO: R$1000 / 200km = R$5/km');
const rFixtureCorrida = historicoPorPeriodo(
  Array.from({ length: 10 }, (_, i) => c({ data: `2026-08-${String(11 + i).padStart(2, '0')}`, valor: 100 })),
  30,
  '2026-08-21',
);
check('fixture', rFixtureCorrida.qtdCorridas === 10 && rFixtureCorrida.valorTotal === 1000, 'OBRIGATÓRIO: 10 corridas de R$100 → total R$1000');
check('fixture', aprox(rFixtureCorrida.valorMedioPorCorrida, 100), 'OBRIGATÓRIO: R$1000 / 10 corridas = R$100/corrida');
const compFixture = compararPeriodoCorridas(
  [
    c({ data: '2026-08-21', valor: 1160 }), // período atual: Aug15–Aug21
    c({ data: '2026-08-10', valor: 1000 }), // período anterior (7d antes): Aug08–Aug14
  ],
  7,
  '2026-08-21',
);
const campoValorFixture = compFixture.campos?.find((f) => f.rotulo === 'Valor total');
check('fixture', campoValorFixture?.variacaoAbs === 160, 'OBRIGATÓRIO: 1160 vs. 1000 anterior → Δ = +160');
check('fixture', aprox(campoValorFixture?.variacaoPct, 16), 'OBRIGATÓRIO: 1160 vs. 1000 anterior → Δ% = +16%');

// ======================= 1-4 — historicoPorPeriodo: 7/14/30/90d =================================
const base1a4 = [c({ data: '2026-08-21', valor: 100, kmEstimado: 10, duracaoEstimadaMin: 60 })];
for (const periodo of [7, 14, 30, 90] as const) {
  const r = historicoPorPeriodo(base1a4, periodo, '2026-08-21');
  check(String(periodo), r.qtdCorridas === 1 && r.valorTotal === 100, `historicoPorPeriodo(${periodo}d): 1 corrida de R$100 → qtd=1, total=100`);
  check(String(periodo), aprox(r.rpKm, 10) && aprox(r.rpHora, 100), `historicoPorPeriodo(${periodo}d): R$10/km e R$100/h calculados via REUSO`);
  check(String(periodo), r.periodo === periodo, `historicoPorPeriodo(${periodo}d): campo periodo ecoa o parâmetro`);
}
const r1vazio = historicoPorPeriodo([], 90, '2026-08-21');
check('1', r1vazio.qtdCorridas === 0 && r1vazio.valorTotal === 0 && r1vazio.valorMedioPorCorrida === null,
  'período vazio → 0 corridas, R$0 total, média null (nunca inventada)');
check('1', r1vazio.duracaoTotalMin === null && r1vazio.duracaoMediaMin === null, 'sem duração em nenhuma corrida → duracaoTotalMin/duracaoMediaMin null (novos campos do módulo A)');

// ======================= 5 — comparação com período anterior ====================================
const c5atual = [c({ data: '2026-08-21', valor: 100, kmEstimado: 10, duracaoEstimadaMin: 60 })];
const c5anterior = [c({ data: '2026-08-10', valor: 50, kmEstimado: 10, duracaoEstimadaMin: 60 })];
const comp5 = compararPeriodoCorridas([...c5atual, ...c5anterior], 7, '2026-08-21');
check('5', comp5.anterior != null, 'com corrida no período anterior → comparação existe (não é null)');
check('5', comp5.anterior?.valorTotal === 50, 'período anterior (Aug08–Aug14) captura a corrida de Aug10');
const campoValor5 = comp5.campos?.find((f) => f.rotulo === 'Valor total');
check('5', aprox(campoValor5?.variacaoPct, 100), 'R$100 vs. R$50 anterior = +100%');

// ======================= 6 — denominador zero / SEM COMPARAÇÃO ==================================
const comp6 = compararPeriodoCorridas(base1a4, 7, '2026-08-21'); // nada no período anterior
check('6', comp6.anterior === null && comp6.campos === null, 'sem NENHUMA corrida no período anterior → comparação null (SEM COMPARAÇÃO, nunca delta contra zero)');
check('6', calcularRpKm(100, 0) === null, 'calcularRpKm com denominador 0 → null, nunca Infinity');
check('6', calcularRph(100, 0) === null, 'calcularRph com denominador 0 → null, nunca Infinity');

// ======================= 7 — inteligenciaPorHorario ==============================================
const c7 = [
  c({ data: '2026-08-21', hora: '05:30', valor: 10, kmEstimado: 5, duracaoEstimadaMin: 15 }),
  c({ data: '2026-08-20', hora: '05:45', valor: 20, kmEstimado: 10, duracaoEstimadaMin: 15 }),
  c({ data: '2026-08-19', hora: '07:00', valor: 15 }), // banda diferente, sem km/duração
  c({ data: '2026-08-18', valor: 999 }), // sem hora — IGNORADA (nunca inventa horário)
  c({ data: '2026-08-17', hora: '23:45', valor: 40, kmEstimado: 20, duracaoEstimadaMin: 40 }), // fronteira 21h–00h
];
const r7 = inteligenciaPorHorario(c7);
const banda0006 = r7.find((f) => f.label === '00h–06h');
const banda0609 = r7.find((f) => f.label === '06h–09h');
const banda2100 = r7.find((f) => f.label === '21h–00h');
check('7', banda0006 != null && banda0006.qtdCorridas === 2 && banda0006.inicio === 0 && banda0006.fim === 6, 'faixa 00h–06h agrupa 2 corridas, com inicio/fim corretos (campos novos)');
check('7', aprox(banda0006?.valorMedioPorCorrida, 15) && banda0006?.valorTotal === 30, 'valor médio/total da faixa 00h–06h = (10+20)/2=15, total=30');
check('7', banda0006?.diasObservados === 2, 'diasObservados conta dias distintos, não corridas (campo novo)');
check('7', banda0609 != null && banda0609.qtdCorridas === 1 && banda0609.rpKm === null && banda0609.rpHora === null, 'faixa 06h–09h isola a corrida sem km/duração → R$/km e R$/h null');
check('7', banda2100 != null && banda2100.qtdCorridas === 1, 'corrida às 23:45 cai na faixa de fronteira 21h–00h');
check('7', r7.reduce((s, f) => s + f.qtdCorridas, 0) === 4, 'corrida SEM hora é excluída da contagem total (nunca vira "00h")');

// ======================= 8 — inteligenciaPorDiaSemana ============================================
const c8 = [
  c({ data: '2026-08-07', valor: 40, kmEstimado: 10, duracaoEstimadaMin: 30 }),
  c({ data: '2026-08-14', valor: 60, kmEstimado: 10, duracaoEstimadaMin: 30 }), // mesmo dia da semana, 7 dias depois
  c({ data: '2026-08-08', valor: 999 }), // dia da semana diferente
];
const r8 = inteligenciaPorDiaSemana(c8);
const grupoComDuas = r8.find((g) => g.qtdCorridas === 2);
check('8', grupoComDuas != null, 'duas corridas 7 dias de distância caem no MESMO grupo de dia da semana');
check('8', grupoComDuas != null && aprox(grupoComDuas.valorMedioPorCorrida, 50) && grupoComDuas.valorTotal === 100, 'valor médio/total do grupo = (40+60)/2=50, total=100 (campo novo)');
check('8', grupoComDuas != null && grupoComDuas.diasObservados === 2, 'diasObservados do dia da semana conta dias distintos (campo novo)');
check('8', grupoComDuas != null && aprox(grupoComDuas.duracaoMediaMin, 30), 'duracaoMediaMin calculada corretamente (campo novo)');
check('8', r8.some((g) => g.qtdCorridas === 1 && g.valorMedioPorCorrida === 999), 'corrida de dia da semana diferente fica isolada em outro grupo');

// ======================= 9-12 — classificarAmostra: limiares 3/7/14 =============================
check('9', classificarAmostra(0) === 'dados_insuficientes' && classificarAmostra(2) === 'dados_insuficientes', '0-2 observações → dados_insuficientes');
check('10', classificarAmostra(3) === 'base_inicial' && classificarAmostra(6) === 'base_inicial', '3-6 observações → base_inicial');
check('11', classificarAmostra(7) === 'base_consistente' && classificarAmostra(13) === 'base_consistente', '7-13 observações → base_consistente');
check('12', classificarAmostra(14) === 'base_relevante' && classificarAmostra(100) === 'base_relevante', '14+ observações → base_relevante');

// ======================= 13 — Módulo D: meta (zero motor novo — só leitura) =====================
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
const ins13 = insightsCopiloto({ corridas: base1a4, ateIso: '2026-08-21', metaHoje: metaHojeFixture, qtdCorridasHoje: 1 });
const insightMeta13 = ins13.find((i) => i.tipo === 'META');
check('13', insightMeta13 != null && /200/.test(insightMeta13.descricao) && /150/.test(insightMeta13.descricao), 'insight META lê metaHoje/realizadoHoje já calculados pelo motor existente, sem recalcular nada');
check('13', /hojeCockpit\.faltanteHoje/.test(copilotoCardSrc) && /hojeCockpit\.metaHoje/.test(copilotoIntelSrc), 'CopilotoCard e CopilotoInteligenteCard leem hojeCockpit já derivado por useMinhaMeta — zero motor de meta novo na UI');

// ======================= 14 — impacto matemático da corrida registrada (CopilotoCard) ===========
check('14', /Esta corrida adicionou/.test(copilotoCardSrc), 'CopilotoCard mostra "Esta corrida adicionou R$X ao seu realizado registrado" após registrar');
check('14', /Após este registro, faltam/.test(copilotoCardSrc), 'CopilotoCard mostra "Após este registro, faltam R$Y" quando ainda há diferença');
check('14', /Com sua média registrada de R\$\/h, isso representa aproximadamente/.test(copilotoCardSrc), 'CopilotoCard usa a frase exigida (cálculo, nunca "você precisa trabalhar")');
check('14', !/você precisa trabalhar/i.test(copilotoCardSrc), 'CopilotoCard NUNCA usa "você precisa trabalhar X horas"');
check('14', aprox(horasParaValor(150, 50), 3), 'horasParaValor(150, taxa=50/h) = 3h — mesma função usada pelo impacto da corrida');
check('14', horasParaValor(150, 0) === null && horasParaValor(150, null) === null, 'horasParaValor com taxa 0 ou ausente → null, nunca Infinity (sem média registrada, sem estimativa)');

// ======================= 15 — insightsCopiloto: tipos automáticos ================================
const ins15vazio = insightsCopiloto({ corridas: [], ateIso: '2026-08-21' });
check('15', ins15vazio.length === 1 && ins15vazio[0].tipo === 'DADO_INSUFICIENTE', 'zero corridas → só DADO_INSUFICIENTE, nada inventado');
check('15', ins15vazio[0].id != null && ins15vazio[0].id !== '', 'todo insight tem id (campo novo do Módulo F)');
const corridasFull: CorridaHistorico[] = [
  c({ data: '2026-08-21', hora: '08:00', app: 'Uber', valor: 100, kmEstimado: 10, duracaoEstimadaMin: 60 }),
  c({ data: '2026-08-20', hora: '08:15', app: 'Uber', valor: 90, kmEstimado: 9, duracaoEstimadaMin: 60 }),
  c({ data: '2026-08-19', hora: '08:30', app: '99', valor: 80 }),
  c({ data: '2026-07-05', hora: '08:00', valor: 20, kmEstimado: 5, duracaoEstimadaMin: 30 }),
];
const ins15 = insightsCopiloto({ corridas: corridasFull, ateIso: '2026-08-21', periodo: 30, metaHoje: metaHojeFixture, qtdCorridasHoje: 1 });
const tipos15 = new Set(ins15.map((i) => i.tipo));
check('15', tipos15.has('EVOLUCAO') && tipos15.has('HORARIO') && tipos15.has('DIA_SEMANA'), 'insights EVOLUCAO/HORARIO/DIA_SEMANA presentes');
check('15', tipos15.has('RPH') && tipos15.has('RPKM') && tipos15.has('META') && tipos15.has('CORRIDA'), 'insights RPH/RPKM/META/CORRIDA presentes');
check('15', new Set(ins15.map((i) => i.id)).size === ins15.length, 'todos os ids de insights são únicos na mesma chamada');
check('15', ins15.every((i) => i.classificacaoAmostra != null), 'todo insight carrega classificacaoAmostra (campo renomeado do Módulo F — era confiancaDados)');

// ======================= 16 — qualidadeBaseCopiloto: descritivo + reuso =========================
const c16 = [
  c({ data: '2026-08-21', valor: 10, kmEstimado: 5, duracaoEstimadaMin: 15, hora: '08:00', app: 'Uber' }),
  c({ data: '2026-08-20', valor: 20 }),
];
const r16 = qualidadeBaseCopiloto(c16);
check('16', r16.totalCorridas === 2 && r16.comKm === 1 && r16.semKm === 1, 'contadores comKm/semKm batem');
check('16', r16.comDuracao === 1 && r16.comHorario === 1 && r16.comApp === 1, 'contadores comDuracao/comHorario/comApp batem');
check('16', r16.faixasHorarioComDados === inteligenciaPorHorario(c16).length, 'faixasHorarioComDados REUSA inteligenciaPorHorario (campo novo, sem reimplementar agrupamento)');
check('16', r16.diasSemanaComDados === inteligenciaPorDiaSemana(c16).length, 'diasSemanaComDados REUSA inteligenciaPorDiaSemana (campo novo)');
const trechoQualidade = motorSrc.slice(motorSrc.indexOf('export function qualidadeBaseCopiloto'), motorSrc.indexOf('export function qualidadeBaseCopiloto') + 900);
const trechoQualidadeSemComentarios = trechoQualidade.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
check('16', !/\bruim\b|\bboa\b|\bótima\b|\bpéssima\b/i.test(trechoQualidadeSemComentarios), 'qualidadeBaseCopiloto nunca julga a operação/motorista no corpo da função');

// ======================= 17 — Módulo H: configuração (limiar null, peso nunca 0) ================
check('17', /peso_rpkm:[\s\S]{0,80}> 0[\s\S]{0,60}: 1/.test(copilotoCardSrc), 'salvarConfig faz fallback para peso=1 quando o campo não é número > 0 (nunca envia peso 0)');
check('17', /peso_rph:[\s\S]{0,80}> 0[\s\S]{0,60}: 1/.test(copilotoCardSrc), 'idem para peso_rph');
check('17', /limiar_rpkm_bom: num\(cf\.limiarRpkmBom\)/.test(copilotoCardSrc), 'limiar vazio passa por num() (null em string vazia) — nunca vira 0');
check('17', !/[Pp]eso R\$\/corrida/.test(copilotoCardSrc), 'Decisão declarada: peso R$/corrida NÃO aparece na UI enquanto avaliarCorrida() não usa peso_rpcorrida (opção preferida do Módulo H, não "finge que funciona")');

// ======================= 18 — ausência de dados (todas as funções, corridas=[]) =================
check('18', historicoPorPeriodo([], 30, '2026-08-21').qtdCorridas === 0, 'historicoPorPeriodo([]) não quebra, retorna zerado honesto');
check('18', inteligenciaPorHorario([]).length === 0, 'inteligenciaPorHorario([]) retorna lista vazia, nunca faixa inventada');
check('18', inteligenciaPorDiaSemana([]).length === 0, 'inteligenciaPorDiaSemana([]) retorna lista vazia');
check('18', qualidadeBaseCopiloto([]).totalCorridas === 0 && qualidadeBaseCopiloto([]).classificacaoAmostra === 'dados_insuficientes', 'qualidadeBaseCopiloto([]) → 0 corridas, dados_insuficientes');

// ======================= 19 — NaN nunca produzido ================================================
const c19 = [c({ data: '2026-08-21', valor: 0, kmEstimado: 0, duracaoEstimadaMin: 0 })];
const r19 = historicoPorPeriodo(c19, 30, '2026-08-21');
check('19', !Number.isNaN(r19.valorTotal) && !Number.isNaN(r19.valorMedioPorCorrida ?? 0), 'corrida de valor/km/duração 0 nunca produz NaN em historicoPorPeriodo');
check('19', r19.rpKm === null && r19.rpHora === null, 'km/duração 0 são tratados como AUSENTES (filtro > 0), nunca dividem por zero');
check('19', !Number.isNaN(horasParaValor(0, 50) ?? 0), 'horasParaValor(0, taxa) nunca produz NaN');

// ======================= 20 — Infinity nunca produzido ============================================
check('20', calcularRpKm(1000, 0) !== Infinity && calcularRpKm(1000, 0) === null, 'calcularRpKm(1000, 0) → null, nunca Infinity');
check('20', calcularRph(1000, 0) !== Infinity && calcularRph(1000, 0) === null, 'calcularRph(1000, 0) → null, nunca Infinity');
check('20', horasParaValor(1000, 0) !== Infinity && horasParaValor(1000, 0) === null, 'horasParaValor(1000, 0) → null, nunca Infinity');

// ======================= 21 — divisão por zero (0 corridas / 0 dias) =============================
const r21 = historicoPorPeriodo([], 7, '2026-08-21');
check('21', r21.mediaCorridasPorDiaComRegistro === null, '0 dias com registro → mediaCorridasPorDiaComRegistro null, nunca 0/0');
check('21', r21.valorMedioPorCorrida === null, '0 corridas → valorMedioPorCorrida null, nunca 0/0');

// ======================= 22 — imutabilidade (funções puras não alteram o array recebido) ========
const c22 = [c({ data: '2026-08-21', valor: 100, kmEstimado: 10, duracaoEstimadaMin: 60, hora: '08:00', app: 'Uber' })];
const c22Snapshot = JSON.parse(JSON.stringify(c22));
historicoPorPeriodo(c22, 30, '2026-08-21');
inteligenciaPorHorario(c22);
inteligenciaPorDiaSemana(c22);
qualidadeBaseCopiloto(c22);
insightsCopiloto({ corridas: c22, ateIso: '2026-08-21' });
check('22', JSON.stringify(c22) === JSON.stringify(c22Snapshot), 'nenhuma das funções do Módulo A-G/F muta o array de corridas recebido');

// ======================= 23 — reuso das funções existentes (grep no motor) ======================
const trechoHistorico = motorSrc.slice(motorSrc.indexOf('export function historicoPorPeriodo'), motorSrc.indexOf('export type ComparacaoPeriodoCorridas'));
check('23', /calcularRpKm\(valorTotal/.test(trechoHistorico) && /calcularRph\(valorTotal/.test(trechoHistorico), 'historicoPorPeriodo REUSA calcularRpKm/calcularRph, nunca reimplementa a divisão');
check('23', !/valorTotal\s*\/\s*kmEstimadoTotal/.test(trechoHistorico) && !/valorTotal\s*\/\s*horasEstimadasTotal/.test(trechoHistorico), 'nenhuma divisão manual de valorTotal por km/horas fora das funções do motor');
const trechoComparar = motorSrc.slice(motorSrc.indexOf('export function compararPeriodoCorridas'), motorSrc.indexOf('export function compararPeriodoCorridas') + 900);
check('23', (trechoComparar.match(/campoEvolucao\(/g) ?? []).length >= 5, 'compararPeriodoCorridas REUSA campoEvolucao (mesmo formato de variação da Fase 12.2)');
check('23', /historicoPorPeriodo\(corridas, periodo, ateIso\)/.test(trechoComparar), 'compararPeriodoCorridas REUSA historicoPorPeriodo dos dois lados (atual e anterior)');
const trechoQualidade23 = motorSrc.slice(motorSrc.indexOf('export function qualidadeBaseCopiloto'), motorSrc.indexOf('export type TipoInsightCopiloto'));
check('23', /inteligenciaPorHorario\(corridas\)\.length/.test(trechoQualidade23) && /inteligenciaPorDiaSemana\(corridas\)\.length/.test(trechoQualidade23), 'qualidadeBaseCopiloto REUSA inteligenciaPorHorario/inteligenciaPorDiaSemana para contar cobertura');
const trechoInsights23 = motorSrc.slice(motorSrc.indexOf('export function insightsCopiloto'));
check('23', /compararPeriodoCorridas\(/.test(trechoInsights23) && /inteligenciaPorHorario\(/.test(trechoInsights23) && /inteligenciaPorDiaSemana\(/.test(trechoInsights23) && /historicoPorPeriodo\(/.test(trechoInsights23), 'insightsCopiloto CONSOME compararPeriodoCorridas/inteligenciaPorHorario/inteligenciaPorDiaSemana/historicoPorPeriodo, nunca recalcula agregação por conta própria');

// ======================= 24 — ausência de query nova (hook) ======================================
const trechoPromiseAll = hookSrc.slice(hookSrc.indexOf('Promise.all(['), hookSrc.indexOf(']);', hookSrc.indexOf('Promise.all([')));
check('24', (trechoPromiseAll.match(/list\w+\(|get\w+\(/g) ?? []).length === 11, 'Promise.all da query base continua com as MESMAS 11 chamadas — zero fetch novo ao Supabase');
check('24', /corridasHistorico[\s\S]{0,200}corridas60\.map/.test(hookSrc), 'corridasHistorico é derivado por MAP client-side de corridas60 (mesma janela já buscada), não uma query nova');

// ======================= 25 — ausência de migration =============================================
const migs25 = readdirSync(join(raizFonte, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 48);
check('25', migs25.every((f) => f.startsWith('0049') || f.startsWith('0050') || f.startsWith('0051')), 'acima da 0048 só existem 0049, 0050 e 0051 (Localização — Fase 20) — Fase 17 não criou NENHUMA migration nova');
const mig49Src = readFileSync(join(raizFonte, 'supabase/migrations/0049_motorista_corridas.sql'), 'utf8');
const mig50Src = readFileSync(join(raizFonte, 'supabase/migrations/0050_motorista_config_copiloto.sql'), 'utf8');
check('25', (mig49Src.match(/create policy/g) ?? []).length === 1 && (mig50Src.match(/create policy/g) ?? []).length === 1, '0049/0050 continuam com exatamente 1 policy cada — zero policy nova, zero RLS alterada');

// ======================= 26 — vocabulário proibido (motor + UI) =================================
const proibido = /\bvocê deve\b|\bvocê precisa trabalhar\b|\baceite\b|\brecuse\b|\bindo mal\b|\bindo bem\b|renda garantida|\bmelhor horário\b|\bmelhor dia\b|\bmelhor região\b|\bdeveria trabalhar\b|\bgarantid[oa]\b/i;
const todosTextosInsights = ins15.flatMap((i) => [i.titulo, i.descricao]).concat(ins15vazio.flatMap((i) => [i.titulo, i.descricao]));
check('26', todosTextosInsights.every((t) => !proibido.test(t)), 'nenhum insight usa linguagem de ordem, julgamento categórico ou promessa de renda');
const insightHorario15 = ins15.find((i) => i.tipo === 'HORARIO');
check('26', insightHorario15 != null && /registrad/i.test(insightHorario15.titulo + insightHorario15.descricao) && !/melhor/i.test(insightHorario15.titulo), 'insight de horário usa "maior média REGISTRADA", nunca "melhor horário"');
const textosJsxProibidos = /melhor horário para trabalhar|melhor dia para trabalhar|você deve trabalhar|renda garantida/i;
check('26', !textosJsxProibidos.test(copilotoCardSrc) && !textosJsxProibidos.test(copilotoIntelSrc) && !textosJsxProibidos.test(copilotoHistSrc), 'nenhum dos 3 componentes de UI usa vocabulário proibido nos textos fixos');

// ======================= relatório ================================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-motorista-copiloto-inteligente: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
