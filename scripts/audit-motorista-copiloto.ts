/* eslint-disable no-console */
// Auditoria determinística da FASE 16 (A/B) — Copiloto do Motorista: avaliarCorrida().
// Cobre: reuso de calcularRpKm/calcularRph (motor único, nenhuma divisão reimplementada),
// guards NaN/zero/negativo/ausente, "NÃO CONFIGURADO nunca vira zero" (limiar ausente não
// pontua a favor nem contra), classificação SEMPRE acompanhada dos critérios que a formaram
// (nunca um selo sozinho), vocabulário proibido (nunca ordena o motorista a aceitar/recusar),
// e a fonte: migrations 0049/0050 são as únicas acima da 0048, RLS espelha 0047/0048.
// CASOS OBRIGATÓRIOS: R$18,50/6,2km ≈ R$2,98/km · R$18,50/15min = R$74/h.
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-motorista-copiloto.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  avaliarCorrida,
  calcularRph,
  calcularRpKm,
  CONFIG_COPILOTO_PADRAO,
  type ConfigCopiloto,
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
check('A', aprox(calcularRpKm(18.5, 6.2), 2.98), 'OBRIGATÓRIO: R$18,50 / 6,2 km ≈ R$2,98/km');
check('A', calcularRph(18.5, 15 / 60) === 74, 'OBRIGATÓRIO: R$18,50 / 15min (0,25h) = R$74/h');

// ======================= B — sem configuração: só leitura, nunca veredito ====================
const semConfigA = avaliarCorrida({ valor: 18.5, kmEstimado: 6.2, duracaoEstimadaMin: 15 }, null);
check('B', semConfigA.configurado === false, 'sem config nenhuma → configurado=false');
check('B', semConfigA.classificacao === 'ATENCAO', 'sem config → classificação neutra (ATENCAO), nunca BOM/RUIM inventado');
check('B', semConfigA.criterios.every((c) => c.status === 'nao_configurado'), 'todos os critérios ficam NÃO CONFIGURADO sem limiar');
check('B', /informativa/.test(semConfigA.observacao) && !/deve|deveria|aceite|recuse/i.test(semConfigA.observacao),
  'observação avisa que é só leitura — nunca uma ordem');

const semConfigB = avaliarCorrida({ valor: 18.5, kmEstimado: 6.2, duracaoEstimadaMin: 15 }, CONFIG_COPILOTO_PADRAO);
check('B', semConfigB.configurado === false, 'CONFIG_COPILOTO_PADRAO (todos os limiares null) também é "não configurado"');

// ======================= C — dado ausente não vira zero =======================================
const semKm = avaliarCorrida({ valor: 20, kmEstimado: null, duracaoEstimadaMin: 15 }, { ...CONFIG_COPILOTO_PADRAO, limiarRpkmBom: 3, limiarRpkmRuim: 1.5 });
check('C', semKm.rpKm === null, 'sem km estimado → rpKm null (nunca 0)');
check('C', semKm.criterios.find((c) => c.rotulo === 'R$/km')?.status === 'nao_configurado', 'critério R$/km sem dado fica NÃO CONFIGURADO, não entra na média');

const semDuracao = avaliarCorrida({ valor: 20, kmEstimado: 5, duracaoEstimadaMin: null }, { ...CONFIG_COPILOTO_PADRAO, limiarRphBom: 40 });
check('C', semDuracao.rpHora === null, 'sem duração → rpHora null (nunca 0)');

const valorNegativo = avaliarCorrida({ valor: -10, kmEstimado: 5, duracaoEstimadaMin: 10 }, CONFIG_COPILOTO_PADRAO);
check('C', valorNegativo.rpKm === 0, 'valor negativo é clampado pelo guard seguro() (nunca propaga negativo)');

// ======================= D — classificação com limiares (BOM / ATENCAO / RUIM) ================
const configD: ConfigCopiloto = { limiarRpkmBom: 2.5, limiarRpkmRuim: 1.2, limiarRphBom: 35, limiarRphRuim: 15, pesoRpkm: 1, pesoRph: 1 };
const corridaBoa = avaliarCorrida({ valor: 30, kmEstimado: 10, duracaoEstimadaMin: 30 }, configD); // R$3/km, R$60/h
check('D', corridaBoa.classificacao === 'BOM', 'R$3/km e R$60/h acima dos limiares bons → BOM');
check('D', corridaBoa.criterios.length === 2 && corridaBoa.criterios.every((c) => c.status === 'bom'), 'os 2 critérios aparecem, ambos "bom" — nunca um selo sozinho');

const corridaRuim = avaliarCorrida({ valor: 6, kmEstimado: 10, duracaoEstimadaMin: 30 }, configD); // R$0,60/km, R$12/h
check('D', corridaRuim.classificacao === 'RUIM', 'R$0,60/km e R$12/h abaixo dos limiares ruins → RUIM');

const corridaMeio = avaliarCorrida({ valor: 20, kmEstimado: 10, duracaoEstimadaMin: 30 }, configD); // R$2/km, R$40/h
check('D', corridaMeio.classificacao === 'ATENCAO' || corridaMeio.classificacao === 'BOM',
  'valores mistos (um bom, um no meio) nunca caem em RUIM sem pelo menos um critério ruim');

// critério em conflito (um bom, um ruim) — a média pondera, resultado não pode ser um extremo cego
const configPesoIgual: ConfigCopiloto = { limiarRpkmBom: 2.5, limiarRpkmRuim: 1.2, limiarRphBom: 80, limiarRphRuim: 60, pesoRpkm: 1, pesoRph: 1 };
const corridaConflito = avaliarCorrida({ valor: 30, kmEstimado: 10, duracaoEstimadaMin: 30 }, configPesoIgual); // R$3/km bom, R$60/h ruim
check('D', corridaConflito.classificacao === 'ATENCAO', 'um critério bom + um ruim, pesos iguais → média neutra = ATENCAO (transparente, não esconde o conflito)');
check('D', corridaConflito.criterios.some((c) => c.status === 'bom') && corridaConflito.criterios.some((c) => c.status === 'ruim'),
  'os dois critérios em conflito aparecem explicitamente — motorista vê a divergência, não só o veredito');

// ======================= E — pesos configuráveis mudam o resultado, nunca escondem o critério ==
const configPesoRpkmMaior: ConfigCopiloto = { ...configPesoIgual, pesoRpkm: 3, pesoRph: 1 };
const corridaPesoAjustado = avaliarCorrida({ valor: 30, kmEstimado: 10, duracaoEstimadaMin: 30 }, configPesoRpkmMaior);
check('E', corridaPesoAjustado.classificacao === 'BOM', 'peso maior em R$/km (critério bom) muda o resultado pra BOM — critério continua visível');
check('E', corridaPesoAjustado.criterios.length === 2, 'mesmo com peso desigual, os 2 critérios continuam aparecendo (transparência nunca é sacrificada)');

// ======================= F — vocabulário proibido (nunca ordena, nunca julga) ==================
const proibido = /\bvocê deve\b|\bvocê precisa\b|\baceite\b|\brecuse\b|\bindo mal\b|\bindo bem\b|renda garantida/i;
const todasObservacoes = [semConfigA, semConfigB, corridaBoa, corridaRuim, corridaMeio, corridaConflito, corridaPesoAjustado]
  .flatMap((a) => [a.observacao, ...a.criterios.map((c) => c.detalhe)]);
check('F', todasObservacoes.every((t) => !proibido.test(t)), 'nenhuma observação/critério usa linguagem de ordem ou julgamento (Fase R)');

// ======================= G — fonte: reuso, migrations, RLS ======================================
const raiz = join(new URL('.', import.meta.url).pathname, '..');
const motor = readFileSync(join(raiz, 'src/features/motorista-app/lib/metas.ts'), 'utf8');
check('G', (motor.match(/export function avaliarCorrida/g) ?? []).length === 1, 'avaliarCorrida existe UMA vez');
check('G', /avaliarCorrida[\s\S]{0,400}calcularRpKm\(/.test(motor), 'avaliarCorrida REUSA calcularRpKm (não reimplementa a divisão)');
check('G', /avaliarCorrida[\s\S]{0,600}calcularRph\(/.test(motor), 'avaliarCorrida REUSA calcularRph');

const mig49 = readFileSync(join(raiz, 'supabase/migrations/0049_motorista_corridas.sql'), 'utf8');
check('G', /create table if not exists motorista_corridas/.test(mig49), '0049 cria motorista_corridas');
check('G', /current_motorista_id\(\)/.test(mig49) && !/eh_staff/.test(mig49), '0049: RLS do dono, ZERO policy de staff');
check('G', !/audit_log/i.test(mig49.replace(/--.*$/gm, '')), '0049: sem trigger de audit_log (privacidade — mesma filosofia 0047/0048)');
check('G', !/veiculos|checklists|contratos|telemetria|manutencoes|lancamentos|pagamentos/i.test(mig49.replace(/--.*$/gm, '')),
  '0049: NÃO toca tabelas da empresa (dado de corrida é pessoal)');
check('G', !/origem_captura text not null default 'manual' check/i.test(mig49), 'origem_captura é texto livre, sem CHECK IN rígido');

const mig50 = readFileSync(join(raiz, 'supabase/migrations/0050_motorista_config_copiloto.sql'), 'utf8');
check('G', /create table if not exists motorista_config_copiloto/.test(mig50), '0050 cria motorista_config_copiloto');
check('G', /current_motorista_id\(\)/.test(mig50) && !/eh_staff/.test(mig50), '0050: RLS do dono, ZERO policy de staff');
check('G', !/audit_log/i.test(mig50.replace(/--.*$/gm, '')), '0050: sem trigger de audit_log');
check('G', /peso_rpkm numeric\(3,2\) not null default 1 check \(peso_rpkm > 0\)/.test(mig50), '0050: peso nunca pode ser 0 (desligar critério é via limiar nulo)');

const migs = readdirSync(join(raiz, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 48);
check('G', migs.every((f) => f.startsWith('0049') || f.startsWith('0050') || f.startsWith('0051')), 'acima da 0048 só existem 0049, 0050 e 0051 (Fase 16/20 — sem migration de assinatura ainda)');

// ======================= relatório ============================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-motorista-copiloto: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
