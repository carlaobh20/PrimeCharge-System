/* eslint-disable no-console */
// Auditoria determinística da FASE 14 — Rotina Operacional + Fechamento Diário.
// O ciclo: ABRIR → REGISTRAR → ACOMPANHAR → ENCERRAR → CONSULTAR. Tudo derivado dos registros
// que já existem (0047/0048): nenhum enum novo, nenhuma linha artificial, ZERO migration.
// Cobre: os 6 estados do dia, revisão factual antes de encerrar (nunca bloqueia), fechamento
// de semana/mês reusando janelaOperacional, correção pós-encerramento, virada do dia, guards.
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-motorista-rotina.ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  diasDecorridosNoPeriodo,
  ESTADO_DIA_LABEL,
  estadoDoDia,
  fechamentoDoPeriodo,
  revisaoDoDia,
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
const dia = (
  data: string,
  valor: number,
  horas: number | null = null,
  km: [number, number] | null = null,
  corridas: number | null = null,
  observacao: string | null = null,
): GanhoJanela & { observacao?: string | null } => ({
  data, valor, horas,
  km_inicio: km?.[0] ?? null,
  km_fim: km?.[1] ?? null,
  corridas, observacao,
});

// ======================= A — ESTADOS DO DIA (Módulo 1) ======================================
check('A', estadoDoDia({ registroDeHoje: null, totalRegistrosHistorico: 0 }) === 'sem_dados',
  'nunca registrou nada → SEM DADOS');
check('A', estadoDoDia({ registroDeHoje: null, totalRegistrosHistorico: 12 }) === 'nao_comecou',
  'tem histórico, hoje sem registro → AINDA NÃO COMEÇOU');
check('A', estadoDoDia({ registroDeHoje: dia('2026-08-20', 0, 3), totalRegistrosHistorico: 5 }) === 'em_andamento',
  'registro sem ganho ainda → EM ANDAMENTO');
check('A', estadoDoDia({ registroDeHoje: dia('2026-08-20', 300), totalRegistrosHistorico: 5 }) === 'dados_parciais',
  'ganho sem horas/km → DADOS PARCIAIS');
check('A', estadoDoDia({ registroDeHoje: dia('2026-08-20', 300, 8), totalRegistrosHistorico: 5 }) === 'dados_parciais',
  'ganho + horas mas sem km → DADOS PARCIAIS');
check('A', estadoDoDia({ registroDeHoje: dia('2026-08-20', 300, 8, [100, 250]), totalRegistrosHistorico: 5 }) === 'pronto_para_encerrar',
  'ganho + horas + km completo → PRONTO PARA ENCERRAR');
check('A', estadoDoDia({ registroDeHoje: dia('2026-08-20', 300, 8, [100, 250], 12, 'dia_encerrado'), totalRegistrosHistorico: 5 }) === 'encerrado',
  'observacao=dia_encerrado → DIA ENCERRADO');
check('A', estadoDoDia({ registroDeHoje: dia('2026-08-20', 0, null, null, null, 'dia_encerrado'), totalRegistrosHistorico: 5 }) === 'encerrado',
  'encerrado vence os demais estados (independe dos campos)');
check('A', estadoDoDia({ registroDeHoje: dia('2026-08-20', 300, 8, [250, 100]), totalRegistrosHistorico: 5 }) === 'dados_parciais',
  'km invertido não conta como completo (não vira PRONTO)');
check('A', Object.keys(ESTADO_DIA_LABEL).length === 6, 'exatamente 6 estados rotulados');
check('A', ESTADO_DIA_LABEL.pronto_para_encerrar === 'Pronto para encerrar' && ESTADO_DIA_LABEL.nao_comecou === 'Ainda não começou',
  'rótulos exatamente como a missão pede');
const guardEstado = estadoDoDia({ registroDeHoje: dia('2026-08-20', NaN, NaN as unknown as number), totalRegistrosHistorico: -3 });
check('A', guardEstado === 'em_andamento', 'NaN nos campos → tratado como sem ganho (nunca quebra)');

// ======================= B — REVISÃO ANTES DE ENCERRAR (Módulo 11) ==========================
const revCompleta = revisaoDoDia(dia('2026-08-20', 400, 8, [100, 250], 15), [{ custo: 30 }]);
check('B', revCompleta.length === 5, '5 itens de revisão (ganho, horas, km, corridas, recarga)');
check('B', revCompleta.every((i) => i.ok), 'dia completo → todos os itens OK');
check('B', revCompleta.some((i) => i.rotulo.includes('150 km')), 'KM completo mostra os km calculados');
const revVazia = revisaoDoDia(null, []);
check('B', revVazia.every((i) => !i.ok), 'sem registro → todos os itens em aviso');
check('B', revVazia.length === 5, 'mesmo sem registro, a revisão lista os 5 itens');
const revParcial = revisaoDoDia(dia('2026-08-20', 400, null, [100, null] as unknown as [number, number]), []);
check('B', revParcial.some((i) => i.rotulo.includes('KM incompleto')), 'um odômetro só → "KM incompleto"');
check('B', revParcial.some((i) => i.ok && i.rotulo === 'Ganho registrado'), 'ganho presente marcado OK mesmo com o resto faltando');
const culpa = /errad|culpa|deveria|preguiç|ruim|falhou você/i;
check('B', [...revCompleta, ...revVazia, ...revParcial].every((i) => !culpa.test(i.rotulo)),
  'NENHUM item usa linguagem de culpa (Módulo 11)');

// ======================= C — DIAS DECORRIDOS NO PERÍODO =====================================
// 2026-08-20 é quinta-feira.
check('C', diasDecorridosNoPeriodo('2026-08-20', 'semana') === 4, 'quinta → 4 dias decorridos na semana (seg→qui)');
check('C', diasDecorridosNoPeriodo('2026-08-20', 'mes') === 20, 'dia 20 → 20 dias decorridos no mês');
check('C', diasDecorridosNoPeriodo('2026-08-17', 'semana') === 1, 'segunda → 1 dia decorrido');
check('C', diasDecorridosNoPeriodo('2026-08-23', 'semana') === 7, 'domingo → 7 dias (fecha a semana)');
check('C', diasDecorridosNoPeriodo('data-invalida', 'semana') === 1, 'data inválida → 1 (nunca 0, nunca NaN)');

// ======================= D — FECHAMENTO DE SEMANA / MÊS (Módulos 17/18) =====================
const ganhosD = [
  dia('2026-08-20', 400, 10, [100, 250], 18),                       // quinta, aberto
  dia('2026-08-19', 300, 6, null, null, 'dia_encerrado'),           // quarta, encerrado
  dia('2026-08-18', 350, 7, [250, 350], 10, 'dia_encerrado'),       // terça, encerrado
  dia('2026-08-10', 500, 10, [0, 100], 20, 'dia_encerrado'),        // fora da semana, dentro do mês
];
const recargasD = [
  { data: '2026-08-20', custo: 32.4, kwh: 18.7 },
  { data: '2026-08-10', custo: 50, kwh: null },
];
const fSemana = fechamentoDoPeriodo(ganhosD, recargasD, '2026-08-20', 'semana', 378.46);
check('D', fSemana.diasRegistrados === 3, 'semana: 3 dias registrados (o dia 10 fica fora)');
check('D', fSemana.diasEncerrados === 2, 'semana: 2 dias encerrados');
check('D', fSemana.ganhoTotal === 1050, 'semana: ganho 1.050');
check('D', fSemana.recargasQtd === 1 && fSemana.custoOperacionalRegistrado === 32.4, 'semana: só a recarga da semana entra');
check('D', fSemana.rotulo === 'Fechamento da semana', 'rótulo da semana');
const fMes = fechamentoDoPeriodo(ganhosD, recargasD, '2026-08-20', 'mes', 378.46);
check('D', fMes.diasRegistrados === 4 && fMes.diasEncerrados === 3, 'mês: 4 registrados, 3 encerrados');
check('D', fMes.ganhoTotal === 1550, 'mês: ganho 1.550');
check('D', fMes.recargasQtd === 2 && fMes.custoOperacionalRegistrado === 82.4, 'mês: as duas recargas entram');
check('D', fMes.kmTotal === 350, 'mês: km 150+100+100');
check('D', fMes.rotulo === 'Fechamento do mês', 'rótulo do mês');
const fVazio = fechamentoDoPeriodo([], [], '2026-08-20', 'semana', 100);
check('D', fVazio.diasRegistrados === 0 && fVazio.diasEncerrados === 0 && fVazio.rsHora === null,
  'período sem registro → zeros e nulls (SEM DADO), nada inventado');

// ======================= E — CICLO: registrar → encerrar → corrigir (Módulos 5/13) ==========
// O upsert por (motorista, data) é a base: o mesmo dia é sempre a MESMA linha.
let registro = dia('2026-08-20', 0, null);                                   // abriu
check('E', estadoDoDia({ registroDeHoje: registro, totalRegistrosHistorico: 3 }) === 'em_andamento', 'ciclo: começou');
registro = { ...registro, valor: 250 };                                       // registrou ganho
check('E', estadoDoDia({ registroDeHoje: registro, totalRegistrosHistorico: 3 }) === 'dados_parciais', 'ciclo: ganho lançado');
registro = { ...registro, horas: 6, km_inicio: 100, km_fim: 220 };            // completou
check('E', estadoDoDia({ registroDeHoje: registro, totalRegistrosHistorico: 3 }) === 'pronto_para_encerrar', 'ciclo: pronto');
registro = { ...registro, observacao: 'dia_encerrado' };                      // encerrou
check('E', estadoDoDia({ registroDeHoje: registro, totalRegistrosHistorico: 3 }) === 'encerrado', 'ciclo: encerrado');
const corrigido = { ...registro, valor: 300 };                                // CORREÇÃO posterior
check('E', estadoDoDia({ registroDeHoje: corrigido, totalRegistrosHistorico: 3 }) === 'encerrado' && corrigido.valor === 300,
  'correção pós-encerramento é permitida e NÃO desfaz o encerramento (Módulo 13)');
// Virada do dia (Módulo 15): o registro de ontem não vale como o de hoje.
const ontem = dia('2026-08-19', 400, 8, [100, 250], 12, 'dia_encerrado');
const hojeSemRegistro = [ontem].find((g) => g.data === '2026-08-20') ?? null;
check('E', estadoDoDia({ registroDeHoje: hojeSemRegistro, totalRegistrosHistorico: 1 }) === 'nao_comecou',
  'dia seguinte começa limpo — registro de ontem NUNCA vira o de hoje (Módulo 15)');

// ======================= F — fonte: reuso, zero migration, sem página nova ==================
const raiz = join(new URL('.', import.meta.url).pathname, '..');
const motor = readFileSync(join(raiz, 'src/features/motorista-app/lib/metas.ts'), 'utf8');
check('F', /fechamentoDoPeriodo[\s\S]{0,700}janelaOperacional\(/.test(motor), 'fechamentoDoPeriodo REUSA janelaOperacional');
check('F', /estadoDoDia[\s\S]{0,900}calcularKmRodados\(/.test(motor), 'estadoDoDia REUSA calcularKmRodados');
check('F', (motor.match(/export function janelaOperacional/g) ?? []).length === 1, 'janelaOperacional continua única');
const migs = readdirSync(join(raiz, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 48);
check('F', migs.every((f) => f.startsWith('0049') || f.startsWith('0050')), 'ZERO migration na Fase 14 (Módulo 22); acima da 0048 só existem 0049/0050 (Copiloto — Fase 16)');

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
check('F', fonteApp.every(({ s }) => !s.includes("from 'recharts'") && !s.includes('pdfmake') && !s.includes('fflate') && !s.includes('chart.js')),
  'nenhuma biblioteca nova (Módulo 23)');
const paginas = lerTudo(join(raiz, 'src/features/motorista-app/pages')).filter((p) => /Meta|Financ|Operacao|Rotina|Diario/i.test(p));
check('F', paginas.length === 1, 'nenhuma página nova de operação (Centro de Controle segue único)');

const rotina = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/RotinaDoDiaCard.tsx'), 'utf8');
check('F', /não grava nada|só abre o formulário/i.test(rotina), 'abrir o registro NÃO cria linha vazia (Módulo 2 declarado no código)');
check('F', /Encerrar mesmo assim/.test(rotina) && /Voltar e completar/.test(rotina), 'as duas saídas do encerramento existem (Módulo 11)');
check('F', /não impedem o encerramento/i.test(rotina), 'avisos declarados como não-bloqueantes');
check('F', /nunca altera o odômetro do veículo/i.test(rotina), 'KM é dado pessoal — nunca escreve no veículo (Módulo 6)');
check('F', /Um registro por dia/i.test(rotina), 'upsert por dia declarado ao motorista (Módulo 5)');
check('F', /continuam disponíveis para consulta/i.test(rotina), 'dia encerrado informa que os dados seguem disponíveis (Módulo 12)');
const pagina = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/CentroControlePage.tsx'), 'utf8');
check('F', pagina.indexOf('<RotinaDoDiaCard') < pagina.indexOf('<ChecklistHojeCard'), 'rotina do dia fica no topo, logo após o hero');
check('F', /preserva os demais campos do mesmo dia/i.test(pagina), 'registro rápido documentado como upsert parcial');
check('F', (pagina.match(/observacao: 'dia_encerrado'/g) ?? []).length >= 1, 'encerramento continua usando a marca existente (sem coluna nova)');
const fech = readFileSync(join(raiz, 'src/features/motorista-app/components/meta/FechamentoCard.tsx'), 'utf8');
check('F', /SEM COMPARAÇÃO/.test(fech) && /sem causalidade/.test(fech), 'fechamento sem dados → SEM COMPARAÇÃO, sem causalidade');
check('F', /SEM DADO/.test(fech), 'período vazio → SEM DADO explícito');

const proibidos = /você deve trabalhar|você precisa trabalhar|trabalhe mais|indo mal|indo bem|\bsalário\b|renda garantida|lucro garantido|melhor horário|horário ideal/i;
let vocabOk = true;
for (const { p, s } of fonteApp) {
  for (const linha of s.split('\n')) {
    if (/nunca|proibid|não usa|jamais|NÃO/i.test(linha)) continue;
    if (proibidos.test(linha)) { vocabOk = false; console.error(`   vocabulário proibido em ${p}: ${linha.trim()}`); }
  }
}
check('F', vocabOk, 'vocabulário proibido (Módulo 26) ausente do app inteiro');

// ======================= relatório ===========================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-motorista-rotina: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
