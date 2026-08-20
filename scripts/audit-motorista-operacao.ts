/* eslint-disable no-console */
// Auditoria determinística da FASE 10 — Inteligência Operacional Real do Motorista.
// Cobre: R$/hora e R$/dia REAIS (só sobre registros; sem dado → null, nunca estimativa
// silenciosa), custo/dia (REUSA calcularMeta), custo/hora, cobertura das janelas 7/14/30,
// ponto de equilíbrio duplo, tendência, dias da semana, projeções duplas com origem declarada,
// confiança (classificação de quantidade, não estatística), qualidade dos registros e a
// auditoria de duplicação/migration/performance no fonte.
// CASOS OBRIGATÓRIOS: 1.000/20h=50/h · 1.000/10d=100/dia · 3.000/100h=30/h · 47,80/40=119,5%.
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-motorista-operacao.ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  confiancaDados,
  custoPorDiaPlanejado,
  custoPorHoraReal,
  eficienciaVsPremissa,
  formatHoras,
  ganhosNaJanela,
  janelaOperacional,
  mediaRealPorDia,
  mediaRealPorHora,
  mediasPorDiaSemana,
  pontoEquilibrioDuplo,
  projecoesDuplas,
  qualidadeDados,
  tendencia,
  type GanhoDia,
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
const dia = (n: number, valor: number, horas: number | null = null): GanhoDia => ({
  data: new Date(Date.UTC(2026, 7, n, 12)).toISOString().slice(0, 10),
  valor,
  horas,
});

// ======================= A — CASOS OBRIGATÓRIOS ==============================================
const gA = [dia(1, 400, 8), dia(2, 300, 6), dia(3, 300, 6)]; // 1.000 em 20h
check('A', aprox(mediaRealPorHora(gA)?.valor, 50), 'OBRIGATÓRIO: R$1.000 / 20h = R$50/h');
const gB = Array.from({ length: 10 }, (_, i) => dia(i + 1, 100));
check('A', aprox(mediaRealPorDia(gB)?.valor, 100), 'OBRIGATÓRIO: R$1.000 / 10 dias = R$100/dia');
check('A', custoPorHoraReal(3000, 100) === 30, 'OBRIGATÓRIO: R$3.000 / 100h = R$30/h');
check('A', aprox(eficienciaVsPremissa(47.8, 40), 119.5), 'OBRIGATÓRIO: 47,80 / 40 = 119,5%');

// ======================= B — médias reais: só registros, nunca inventado =====================
check('B', mediaRealPorHora([]) === null, 'sem registros → R$/h null');
check('B', mediaRealPorHora([dia(1, 400, null)]) === null, 'ganho SEM horas não entra no R$/h (nada estimado)');
check('B', mediaRealPorHora([dia(1, 0, 8)]) === null, 'horas sem ganho não produzem R$/h');
const misto = mediaRealPorHora([dia(1, 400, 8), dia(2, 300, null), dia(3, 100, 2)]);
check('B', misto != null && aprox(misto.valor, 50) && misto.dias === 2, 'R$/h usa SÓ os dias completos (500/10h; o dia sem horas fica fora)');
check('B', mediaRealPorDia([]) === null, 'sem registros → R$/dia null');
check('B', aprox(mediaRealPorDia([dia(1, NaN), dia(2, 200)])?.valor, 100), 'valor inválido vira 0 (200/2=100), nunca NaN');
check('B', eficienciaVsPremissa(null, 40) === null, 'sem real → eficiência null');
check('B', eficienciaVsPremissa(50, 0) === null, 'premissa 0 → null (nunca Infinity)');

// ======================= C — custos derivados (REUSO) ========================================
check('C', custoPorDiaPlanejado(9840, 26) === 378.46, 'custo/dia = mesma conta da meta diária (reuso de calcularMeta)');
check('C', custoPorDiaPlanejado(9840, 0) === custoPorDiaPlanejado(9840, 26), 'dias 0 → default 26 (guard herdado)');
check('C', custoPorHoraReal(3000, 0) === null, '0 horas → null (nunca ÷0)');
check('C', custoPorHoraReal(NaN, 10) === 0, 'custo NaN → 0');

// ======================= D — janelas 7/14/30 (Módulo 8) ======================================
const hoje = '2026-08-20';
const gD = [dia(20, 400, 8), dia(19, 300, 6), dia(18, 350, 7), dia(10, 500, 10), dia(1, 200, 4)];
check('D', ganhosNaJanela(gD, 7, hoje).length === 3, 'janela de 7 dias pega 18/19/20');
check('D', ganhosNaJanela(gD, 14, hoje).length === 4, 'janela de 14 pega também o dia 10');
check('D', ganhosNaJanela(gD, 30, hoje).length === 5, 'janela de 30 pega tudo');
const j7 = janelaOperacional(gD, 7, hoje, 378.46);
check('D', j7.ganhoTotal === 1050 && j7.diasRegistrados === 3, 'janela 7: 1.050 em 3 dias');
check('D', aprox(j7.rsDia, 350), 'R$/dia da janela = 1.050/3');
check('D', aprox(j7.rsHora, 50), 'R$/h da janela = 1.050/21h');
check('D', aprox(j7.custoEstimado, 1135.38), 'custo estimado = 378,46 × 3 dias (fórmula declarada)');
check('D', aprox(j7.cobertura, -85.38), 'cobertura = ganho − custo estimado (pode ser negativa)');
const jVazia = janelaOperacional([], 7, hoje, 378.46);
check('D', jVazia.diasRegistrados === 0 && jVazia.rsDia === null && jVazia.cobertura === null, 'janela vazia → nulls ("Dados insuficientes"), nunca estimativa');
const jSemHoras = janelaOperacional([dia(20, 400), dia(19, 300)], 7, hoje, 100);
check('D', jSemHoras.horasTotal === null && jSemHoras.rsHora === null && jSemHoras.rsDia === 350, 'sem horas → R$/h null mas R$/dia existe');

// ======================= E — tendência (Módulo 9) ============================================
const gE = [
  // últimos 7 (14–20): 3 dias completos a ~45,2/h
  dia(20, 452, 10), dia(18, 452, 10), dia(16, 452, 10),
  // 7 anteriores (7–13): 3 dias a ~41,3/h
  dia(13, 413, 10), dia(11, 413, 10), dia(9, 413, 10),
];
const tE = tendencia(gE, 7, hoje);
check('E', tE != null && tE.metrica === 'rs_hora' && aprox(tE.atual, 45.2) && aprox(tE.anterior, 41.3), 'tendência compara R$/h das duas janelas');
check('E', tE != null && aprox(tE.variacaoPct, 9.4, 0.1), 'exemplo da missão: 45,20 vs 41,30 = +9,4%');
check('E', tendencia([dia(20, 100), dia(19, 100)], 7, hoje) === null, '< 3 dias em qualquer lado → null (dados insuficientes)');
const tSemHoras = tendencia([dia(20, 100), dia(19, 100), dia(18, 100), dia(13, 80), dia(12, 80), dia(11, 80)], 7, hoje);
check('E', tSemHoras != null && tSemHoras.metrica === 'rs_dia' && aprox(tSemHoras.variacaoPct, 25), 'sem horas → cai para R$/dia (100 vs 80 = +25%)');

// ======================= F — equilíbrio duplo (Módulo 7) =====================================
const eqF = pontoEquilibrioDuplo(320, 40, 47.8);
check('F', aprox(eqF.estimadoHoras, 8), 'estimado: 320/40 = 8h/dia');
check('F', eqF.observadoHoras != null && formatHoras(eqF.observadoHoras) === '6h42', 'observado: 320/47,80 ≈ 6h42/dia');
check('F', pontoEquilibrioDuplo(320, 0, null).estimadoHoras === null, 'premissa 0 → null (nunca Infinity)');
check('F', pontoEquilibrioDuplo(320, 40, null).observadoHoras === null, 'sem real → observado null (só com dados suficientes)');

// ======================= G — confiança + qualidade (Módulos 16/19) ===========================
check('G', confiancaDados(0) === 'insuficiente' && confiancaDados(2) === 'insuficiente', '< 3 dias → DADOS INSUFICIENTES');
check('G', confiancaDados(3) === 'base_inicial' && confiancaDados(6) === 'base_inicial', '3–6 → BASE INICIAL');
check('G', confiancaDados(7) === 'consistente' && confiancaDados(13) === 'consistente', '7–13 → BASE CONSISTENTE');
check('G', confiancaDados(14) === 'relevante' && confiancaDados(30) === 'relevante', '14+ → HISTÓRICO RELEVANTE');
check('G', confiancaDados(NaN) === 'insuficiente' && confiancaDados(-5) === 'insuficiente', 'guards de entrada');
const qG = qualidadeDados([dia(1, 400, 8), dia(2, 300, null), dia(3, 0, 5), dia(4, 0, null), dia(5, 250, 6)]);
check('G', qG.registrados === 5 && qG.completos === 2, '5 registrados, 2 completos (valor+horas)');
check('G', qG.incompletos === 3 && qG.semHoras === 1 && qG.horasSemGanho === 1 && qG.valoresZero === 2, 'incompletos decompostos: sem horas / horas sem ganho / zeros');

// ======================= H — dias da semana (Módulo 10) ======================================
// 20/08/2026 = quinta. Montar 2 quartas boas e 2 segundas fracas, com horas.
const gH = [
  dia(5, 510, 10), dia(12, 510, 10), // quartas → 51/h
  dia(3, 420, 10), dia(10, 420, 10), // segundas → 42/h
  dia(4, 450, 10), // terça única → fora (min 2 obs)
];
const dsH = mediasPorDiaSemana(gH, 2);
check('H', dsH.length === 2, 'só dias com ≥2 observações entram (terça com 1 fica fora)');
check('H', dsH[0].label === 'QUA' && aprox(dsH[0].media, 51) && dsH[0].metrica === 'rs_hora', 'QUA com maior média registrada (51/h)');
check('H', dsH[1].label === 'SEG' && aprox(dsH[1].media, 42), 'SEG 42/h');
check('H', mediasPorDiaSemana([dia(1, 100)], 2).length === 0, '1 registro só → nada (nunca conclui de amostra mínima)');

// ======================= I — projeções duplas (Módulo 15) ====================================
const pI = projecoesDuplas({ realizado: 4820, diasRestantes: 12, metaDiariaOriginal: 378.46, mediaRealDia: 540, diasRegistrados: 14 });
check('I', aprox(pI.pelaPremissa.valor, 9361.52), 'pela PREMISSA: 4.820 + 378,46×12');
check('I', pI.peloHistorico != null && aprox(pI.peloHistorico.valor, 11300, 20), 'pelo HISTÓRICO: 4.820 + 540×12 ≈ 11.300 (exemplo da missão)');
check('I', pI.pelaPremissa.formula.includes('PREMISSA') && (pI.peloHistorico?.formula.includes('média registrada') ?? false), 'origem DECLARADA nas duas fórmulas');
check('I', projecoesDuplas({ realizado: 500, diasRestantes: 10, metaDiariaOriginal: 400, mediaRealDia: 250, diasRegistrados: 2 }).peloHistorico === null, '< 3 dias registrados → projeção histórica null');
check('I', Number.isFinite(projecoesDuplas({ realizado: NaN, diasRestantes: NaN, metaDiariaOriginal: NaN, mediaRealDia: null, diasRegistrados: 0 }).pelaPremissa.valor), 'guards: nunca NaN');

// ======================= J — fonte: premissa nunca muda sozinha + honestidade ================
const raiz = join(new URL('.', import.meta.url).pathname, '..');
const opSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/OperacaoRealCard.tsx'), 'utf8');
check('J', /Usar .*como nova premissa|USAR COMO NOVA PREMISSA/i.test(opSrc), 'trocar premissa é BOTÃO explícito (Módulo 17)');
check('J', /nunca muda sozinha/i.test(opSrc), 'aviso "a premissa nunca muda sozinha" presente');
const hookSrc = readFileSync(join(raiz, 'src/features/motorista-app/hooks/useMinhaMeta.ts'), 'utf8');
check('J', !/renda_hora:\s*(realHora|d\.real|media)/i.test(hookSrc), 'hook NUNCA grava renda_hora a partir do histórico automaticamente');
check('J', /Média dos registros informados/i.test(opSrc), 'subtítulo "Média dos registros informados" (nunca "renda garantida")');
check('J', !/renda garantida/i.test(opSrc), 'proibido "renda garantida"');
check('J', /DADO REGISTRADO/.test(opSrc) && /PREMISSA/.test(opSrc) && /ESTIMATIVA/.test(opSrc), 'rótulos DADO REGISTRADO / PREMISSA / ESTIMATIVA separados na tela');
check('J', /Dados insuficientes/i.test(opSrc), 'estado "Dados insuficientes" explícito (nunca preenchido em silêncio)');
check('J', /não é recomendação|não é nota/i.test(opSrc), 'dias da semana/eficiência sem conclusão prescritiva');
const simSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/SimuladorESe.tsx'), 'utf8');
check('J', /Usar minha média registrada/.test(simSrc), 'simulador ganhou "Usar minha média registrada" (Módulo 18) sem alterar dado real');
const carroSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/CarroCard.tsx'), 'utf8');
check('J', /NÃO INFORMADO/.test(carroSrc), 'componente do carro ausente → "NÃO INFORMADO", nunca zero silencioso (Módulo 12)');

// ======================= K — duplicação / migration / performance (26/27/28) =================
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
check('K', fonteApp.filter(({ s }) => /365 \/ 12|52 \/ 12/.test(s)).length === 1, 'fatores de conversão continuam definidos UMA vez');
const motorSrc = readFileSync(join(raiz, 'src/features/motorista-app/lib/metas.ts'), 'utf8');
check('K', /custoPorDiaPlanejado[\s\S]{0,200}calcularMeta\(/.test(motorSrc), 'custo/dia REUSA calcularMeta (não reimplementa divisão)');
const apiSrc = readFileSync(join(raiz, 'src/features/motorista-app/api/financasPessoais.ts'), 'utf8');
check('K', /listGanhosDoMes[\s\S]{0,200}listGanhosPeriodo\(/.test(apiSrc), 'listGanhosDoMes delega para listGanhosPeriodo (query única, sem duplicação)');
check('K', (apiSrc.match(/from\('motorista_ganhos'\)\s*\n?\s*\.select\(/g) ?? []).length === 1, 'UMA única query de leitura de ganhos');
check('K', !apiSrc.replace(/\/\/.*$/gm, '').includes("select('*')"), "sem select('*') (Módulo 23)");
const migs = readdirSync(join(raiz, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 47);
check('K', migs.length === 0, 'ZERO migration na Fase 10 (schema atual comprovadamente suficiente — Módulo 27)');
check('K', fonteApp.every(({ s }) => !s.includes("from 'recharts'") && !s.includes('pdfmake') && !s.includes('fflate')), 'sem Recharts/pdfmake/fflate (Módulos 24/28 — gráfico é CSS)');
const arquivosF10 = fonteApp.filter(({ p }) => /OperacaoReal|lib\/metas|financasPessoais/.test(p));
check('K', arquivosF10.every(({ s }) => !/features\/contracts\/juridico/.test(s)), 'Fase 10 não toca motores jurídicos');
const paginas = lerTudo(join(raiz, 'src/features/motorista-app/pages')).filter((p) => /Meta|Financ|Operacao/i.test(p));
check('K', paginas.length === 1, 'continua UMA página de finanças (nenhuma segunda tela)');

// ======================= relatório ===========================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-motorista-operacao: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
