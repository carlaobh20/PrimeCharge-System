/* eslint-disable no-console */
// Auditoria determinística da FASE 12.1 — Diário Operacional Real.
// Cobre: km rodados derivado (nunca coluna), R$/h, R$/km, R$/corrida (só com corridas>0),
// resultado operacional (ganho − custos REGISTRADOS do dia; vida/aluguel FORA), consumo
// ESTIMADO (ficha × km — nunca chamado de registrado), custo/km, resumo do dia, e a auditoria
// de fonte: reuso (sem segunda tabela de ganhos), RLS 0048 espelho da 0047, sem select('*'),
// Encerrar Dia único, rótulos, divergências nunca automáticas.
// CASOS OBRIGATÓRIOS: 1.000/20h=50/h · 1.000/200km=5/km · 1.000/10 corridas=100/corrida ·
// 3.000−100=2.900 · 100,0→250,0=150 km · final<inicial bloqueado · 200km×15kWh/100km=30kWh EST.
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-motorista-diario.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  calcularConsumoEstimado,
  calcularCustoKm,
  calcularKmRodados,
  calcularResultadoOperacional,
  calcularRpCorrida,
  calcularRph,
  calcularRpKm,
  resumoDiaOperacional,
} from '../src/features/motorista-app/lib/metas';

let passes = 0;
let fails = 0;
const resultados: { caso: string; ok: boolean; msg: string }[] = [];
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  resultados.push({ caso, ok: cond, msg });
}

// ======================= A — CASOS OBRIGATÓRIOS ==============================================
check('A', calcularRph(1000, 20) === 50, 'OBRIGATÓRIO: R$1.000 / 20h = R$50/h');
check('A', calcularRpKm(1000, 200) === 5, 'OBRIGATÓRIO: R$1.000 / 200 km = R$5/km');
check('A', calcularRpCorrida(1000, 10) === 100, 'OBRIGATÓRIO: R$1.000 / 10 corridas = R$100/corrida');
check('A', calcularResultadoOperacional(3000, 100) === 2900, 'OBRIGATÓRIO: 3.000 − 100 = 2.900');
check('A', calcularKmRodados(100.0, 250.0) === 150, 'OBRIGATÓRIO: 100,0 → 250,0 = 150 km');
check('A', calcularKmRodados(250.0, 100.0) === null, 'OBRIGATÓRIO: final < inicial → bloqueado (null)');
check('A', calcularConsumoEstimado(200, 15) === 30, 'OBRIGATÓRIO: 200 km × 15 kWh/100km = 30 kWh ESTIMADOS');

// ======================= B — km derivado, nunca inventado ====================================
check('B', calcularKmRodados(null, 250) === null, 'só km_fim → null (UI mostra KM INCOMPLETO, não calcula)');
check('B', calcularKmRodados(100, null) === null, 'só km_inicio → null');
check('B', calcularKmRodados(null, null) === null, 'nenhum → null');
check('B', calcularKmRodados(-5, 100) === null, 'km negativo → null');
check('B', calcularKmRodados(NaN, 100) === null, 'NaN → null');
check('B', calcularKmRodados(100, 100) === 0, 'mesmo odômetro → 0 km (dia parado é válido)');
check('B', calcularKmRodados(100.4, 250.9) === 150.5, 'decimais preservados a 0,1 km');

// ======================= C — indicadores com guards ==========================================
check('C', calcularRph(1000, 0) === null, '0 horas → R$/h null (nunca ÷0)');
check('C', calcularRph(1000, null) === null, 'sem horas → null');
check('C', calcularRpKm(1000, 0) === null, '0 km → R$/km null');
check('C', calcularRpKm(1000, null) === null, 'sem km → null (NÃO INFORMADO)');
check('C', calcularRpCorrida(1000, 0) === null, '0 corridas → R$/corrida NÃO INFORMADO (nunca ÷0)');
check('C', calcularRpCorrida(1000, null) === null, 'corridas não informadas → null');
check('C', calcularRpCorrida(NaN, 10) === 0, 'ganho NaN → 0 (guard)');
check('C', calcularResultadoOperacional(NaN, NaN) === 0, 'NaN → 0');
check('C', calcularResultadoOperacional(100, 250) === -150, 'resultado pode ser NEGATIVO (fato, mostrado como está)');
check('C', calcularConsumoEstimado(null, 15) === null, 'sem km → consumo estimado null');
check('C', calcularConsumoEstimado(200, null) === null, 'veículo sem ficha → null (nunca inventa consumo)');
check('C', calcularConsumoEstimado(200, 0) === null, 'consumo 0 na ficha → null');
check('C', calcularCustoKm(100, null) === null, 'custo/km sem km → NÃO INFORMADO');
check('C', calcularCustoKm(90, 150) === 0.6, 'custo/km = 90/150 = 0,60');
check('C', calcularCustoKm(NaN, 100) === 0, 'custos NaN → 0');

// ======================= D — resumo do dia (SEU DIA) =========================================
const diaD = { valor: 420, horas: 10, km_inicio: 100, km_fim: 250, corridas: 18, apps: ['uber', '99'] };
const recargasD = [
  { data: '2026-08-20', custo: 32.4, kwh: 18.7 },
  { data: '2026-08-20', custo: 15, kwh: null },
];
const rD = resumoDiaOperacional(diaD, recargasD, 15);
check('D', rD.rph === 42 && rD.kmRodados === 150 && rD.rpkm === 2.8, 'dia completo: 42/h · 150 km · 2,80/km');
check('D', rD.rpCorrida != null && Math.abs(rD.rpCorrida - 23.33) < 0.01, 'R$/corrida = 420/18 = 23,33');
check('D', rD.custoRecargasDia === 47.4, 'custos do dia = soma das recargas (32,40 + 15,00)');
check('D', Math.abs(rD.resultadoOperacional - 372.6) < 0.01, 'resultado operacional = 420 − 47,40 = 372,60');
check('D', rD.kwhRegistradoDia === 18.7, 'kWh REGISTRADO soma só recargas com kWh informado');
check('D', rD.consumoEstimadoKwh === 22.5, 'kWh ESTIMADO = 150 × 15/100 = 22,50 (separado do registrado)');
check('D', rD.custoPorKm != null && Math.abs(rD.custoPorKm - 0.32) < 0.01, 'custo/km do dia = 47,40/150');
check('D', rD.apps.join(',') === 'uber,99', 'apps registrados, sem faturamento por app (fase futura)');

const diaMinimo = resumoDiaOperacional({ valor: 300, horas: null, km_inicio: null, km_fim: null, corridas: null, apps: null }, [], null);
check('D', diaMinimo.rph === null && diaMinimo.kmRodados === null && diaMinimo.rpCorrida === null && !diaMinimo.kmIncompleto,
  'dia só com ganho continua válido — todo o resto NÃO INFORMADO (nada inventado)');
check('D', diaMinimo.resultadoOperacional === 300 && diaMinimo.custoRecargasDia === 0, 'sem recargas → resultado = ganho');
const diaIncompleto = resumoDiaOperacional({ valor: 300, horas: 8, km_inicio: 100, km_fim: null, corridas: null, apps: null }, [], 15);
check('D', diaIncompleto.kmIncompleto && diaIncompleto.kmRodados === null && diaIncompleto.consumoEstimadoKwh === null,
  'um odômetro só → KM INCOMPLETO: sem km, sem consumo estimado');

// ======================= E — separação META × OPERACIONAL ====================================
// resultado operacional NUNCA desconta aluguel/vida — é só recarga registrada do dia.
const rE = resumoDiaOperacional({ valor: 500, horas: 10, km_inicio: null, km_fim: null, corridas: null, apps: null }, [{ data: 'x', custo: 40, kwh: null }], null);
check('E', rE.resultadoOperacional === 460, 'resultado operacional desconta SÓ custos operacionais registrados (não a vida/aluguel)');

// ======================= F — fonte: migration, reuso, privacidade ============================
const raiz = join(new URL('.', import.meta.url).pathname, '..');
const mig = readFileSync(join(raiz, 'supabase/migrations/0048_motorista_diario_operacional.sql'), 'utf8');
check('F', /alter table motorista_ganhos/.test(mig) && !/create table.*motorista_receitas/i.test(mig), '0048 estende motorista_ganhos — NENHUMA segunda tabela de ganhos');
check('F', !/km_rodado/.test(mig.replace(/--.*$/gm, '')), 'km_rodado NÃO é coluna (derivado no motor)');
check('F', /km_fim >= km_inicio/.test(mig), 'constraint km_fim >= km_inicio no banco');
check('F', /current_motorista_id\(\)/.test(mig) && !/eh_staff/.test(mig), '0048: RLS do dono, ZERO policy de staff (filosofia 0047)');
check('F', !/audit_log|timeline_eventos|notificacoes/i.test(mig.replace(/--.*$/gm, '')), '0048: sem audit_log/timeline/notificações');
check('F', !/veiculos|telemetria|manutencoes|lancamentos|pagamentos/.test(mig.replace(/--.*$/gm, '')), '0048: NÃO toca tabelas da empresa (dado pessoal não vira operacional da empresa)');
const migs = readdirSync(join(raiz, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 48);
check('F', migs.every((f) => f.startsWith('0049') || f.startsWith('0050') || f.startsWith('0051') || f.startsWith('0052')), 'acima da 0048 só existem 0049/0050 (Copiloto — Fase 16) e 0051 (Localização — Fase 20); esta fase (12.1) não adicionou nenhuma');
const api = readFileSync(join(raiz, 'src/features/motorista-app/api/financasPessoais.ts'), 'utf8').replace(/\/\/.*$/gm, '');
check('F', !api.includes("select('*')"), "API do diário sem select('*')");
check('F', /listRecargasPeriodo/.test(api) && (api.match(/from\('motorista_recargas'\)\s*\n?\s*\.select\(/g) ?? []).length === 1, 'UMA query de leitura de recargas');
const hook = readFileSync(join(raiz, 'src/features/motorista-app/hooks/useMinhaMeta.ts'), 'utf8');
check('F', /km_fim < g.km_inicio/.test(hook), 'aplicação também bloqueia km_fim < km_inicio antes do banco');
check('F', !/update\(.*veiculos|from\('veiculos'\)\s*\.\s*(update|insert)/.test(hook), 'hook NUNCA escreve em veiculos (comparação é só leitura)');
const heroSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/HeroHoje.tsx'), 'utf8');
check('F', /KM INCOMPLETO/.test(heroSrc), 'Encerrar Dia avisa KM INCOMPLETO com um odômetro só');
check('F', /opcional/i.test(heroSrc) && /Detalhes do dia/.test(heroSrc), 'diário fica atrás de "+ Detalhes (opcional)" — formulário não burocratizado');
const pageSrc = readFileSync(join(raiz, 'src/features/motorista-app/pages/MinhaMetaPage.tsx'), 'utf8');
check('F', (pageSrc.match(/onEncerrarDia/g) ?? []).length === 1, 'Encerrar Dia continua fluxo ÚNICO');
check('F', pageSrc.indexOf('<PlanoDeHoje') < pageSrc.indexOf('<MeuDiaCard'), 'primeira dobra continua "quanto preciso fazer hoje"; MEU DIA vem logo abaixo');
const meuDia = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/MeuDiaCard.tsx'), 'utf8');
check('F', /NÃO INFORMADO/.test(meuDia) && /DADO REGISTRADO/.test(meuDia), 'MEU DIA usa rótulos (REGISTRADO/NÃO INFORMADO)');
check('F', /kWh REGISTRADO/.test(meuDia) && /kWh ESTIMADO/.test(meuDia), 'kWh registrado × estimado SEPARADOS na tela');
const meuDiaSemComentario = meuDia.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/.*$/gm, '');
check('F', /fontes diferentes/.test(meuDia) && !/\berro\b/i.test(meuDiaSemComentario), 'comparação de odômetro: "fontes diferentes", nunca "erro"');
const recargasSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/RecargasCard.tsx'), 'utf8');
check('F', /despesa recorrente de recarga\/combustível e também registros individuais/.test(recargasSrc), 'alerta literal da divergência recorrência × eventos');
check('F', /Manter recorrência/.test(recargasSrc) && /Pausar recorrência/.test(recargasSrc), 'escolha explícita MANTER × PAUSAR (nunca automática)');
const histSrc = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/HistoricoOperacionalCard.tsx'), 'utf8');
check('F', /SEM DADO/.test(histSrc), 'MEUS DIAS: dia/campo sem dado = SEM DADO');
const fontesProibidas = ['recharts', 'pdfmake', 'fflate'];
const novos = ['MeuDiaCard', 'RecargasCard', 'HistoricoOperacionalCard'].map((n) => readFileSync(join(raiz, `src/features/motorista-app/components/meta/${n}.tsx`), 'utf8'));
check('F', novos.every((s) => fontesProibidas.every((f) => !s.includes(f))), 'componentes novos sem bibliotecas pesadas (CSS puro)');
check('F', novos.every((s) => !/\blucro\b/i.test(s)), 'nenhum "lucro" — sempre resultado/cobertura/sobra registrada');

// ======================= relatório ===========================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-motorista-diario: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
