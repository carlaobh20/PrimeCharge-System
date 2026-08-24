/* eslint-disable no-console */
// Auditoria determinística da FASE 19 — Fundação do Centro de Inteligência Operacional (Frota).
// Cobre os 26 casos pedidos no Módulo 19 da especificação. ZERO migration, ZERO tabela nova
// nesta fase (ver `claude/auditoria-fase19-inteligencia-frota.md`) — por isso os casos de
// isolamento de RLS (8-12) são verificados por grep estrutural sobre as migrations já
// existentes (0047/0049), não por SQL novo: nada nesta fase altera RLS, então a garantia é
// "nada mudou", testável sem banco.
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-motorista-inteligencia-frota.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  coordenadaValida,
  interpretarErroGeolocalizacao,
  interpretarPosicaoGeolocalizacao,
  interpretarSuporteGeolocalizacao,
} from '../src/features/motorista-app/lib/localizacao';
import { presencaMotorista } from '../src/features/frota/lib/presenca';
import { distanciaEntrePontos } from '../src/features/frota/lib/geo';
import {
  inteligenciaFrotaHistorica,
  oportunidadeOperacional,
  type RegistroOperacionalFrota,
  type ResumoFrotaFaixaHorario,
} from '../src/features/frota/lib/inteligenciaFrota';

let passes = 0;
let fails = 0;
const resultados: { caso: string; ok: boolean; msg: string }[] = [];
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  resultados.push({ caso, ok: cond, msg });
}
const aprox = (a: number | null | undefined, b: number, tol = 0.01) => a != null && Math.abs(a - b) <= tol;

const raizFonte = join(new URL('.', import.meta.url).pathname, '..');
const mig0049Src = readFileSync(join(raizFonte, 'supabase/migrations/0049_motorista_corridas.sql'), 'utf8');
const mig0047Src = readFileSync(join(raizFonte, 'supabase/migrations/0047_motorista_financas_pessoais.sql'), 'utf8');
const mig0003Src = readFileSync(join(raizFonte, 'supabase/migrations/0003_modulo_veiculos.sql'), 'utf8');
const mig0004Src = readFileSync(join(raizFonte, 'supabase/migrations/0004_modulo_motoristas.sql'), 'utf8');
const mig0005Src = readFileSync(join(raizFonte, 'supabase/migrations/0005_modulo_contratos.sql'), 'utf8');
const arquivosNovos = [
  'src/features/motorista-app/lib/localizacao.ts',
  'src/features/motorista-app/hooks/useGeolocalizacaoMotorista.ts',
  'src/features/frota/lib/presenca.ts',
  'src/features/motorista-app/hooks/useHeartbeatVisibilidade.ts',
  'src/features/frota/lib/geo.ts',
  'src/features/frota/lib/inteligenciaFrota.ts',
].map((f) => readFileSync(join(raizFonte, f), 'utf8'));
const todosArquivosNovosSrc = arquivosNovos.join('\n');
const srcInteiro = readdirSync(join(raizFonte, 'src'), { recursive: true } as never) as unknown as string[]; // apenas para contagem, não usado em grep de conteúdo

// ======================= 1 — GPS permitido =========================================================
const agora = Date.parse('2026-08-21T12:00:00Z');
const r1 = interpretarPosicaoGeolocalizacao({ latitude: -23.5, longitude: -46.6, accuracy: 15, timestamp: agora - 1000 }, agora);
check('1', r1.estado === 'LOCALIZACAO_DISPONIVEL' && r1.posicao != null, 'GPS permitido + coordenada válida + timestamp recente → LOCALIZACAO_DISPONIVEL');
check('1', r1.posicao?.origem === 'PWA_GPS', 'posição obtida carrega origem PWA_GPS');

// ======================= 2 — GPS negado =============================================================
const r2 = interpretarErroGeolocalizacao(1);
check('2', r2.estado === 'PERMISSAO_NEGADA' && r2.posicao === null, 'código de erro 1 (PERMISSION_DENIED) → PERMISSAO_NEGADA, posicao null');

// ======================= 3 — GPS inexistente ========================================================
const r3 = interpretarSuporteGeolocalizacao(false);
check('3', r3?.estado === 'SEM_DADO' && r3?.posicao === null, 'navegador sem suporte → SEM_DADO, posicao null');
check('3', interpretarSuporteGeolocalizacao(true) === null, 'navegador COM suporte → função devolve null (não decide sozinha, segue para os outros ramos)');

// ======================= 4 — timestamp antigo =======================================================
const r4 = interpretarPosicaoGeolocalizacao({ latitude: -23.5, longitude: -46.6, accuracy: 15, timestamp: agora - 10 * 60 * 1000 }, agora);
check('4', r4.estado === 'LOCALIZACAO_INDISPONIVEL' && r4.posicao === null, 'posição de 10min atrás (> 5min de idade máxima) → LOCALIZACAO_INDISPONIVEL, nunca tratada como atual');

// ======================= 5 — coordenada inválida ====================================================
const r5 = interpretarPosicaoGeolocalizacao({ latitude: 999, longitude: -46.6, accuracy: 15, timestamp: agora }, agora);
check('5', r5.estado === 'LOCALIZACAO_INDISPONIVEL' && r5.posicao === null, 'latitude 999 (fora de qualquer limite) → LOCALIZACAO_INDISPONIVEL, posicao null');

// ======================= 6 — latitude fora do limite ================================================
check('6', coordenadaValida(91, 0) === false, 'latitude 91 (> 90) inválida');
check('6', coordenadaValida(-91, 0) === false, 'latitude -91 (< -90) inválida');
check('6', coordenadaValida(90, 0) === true && coordenadaValida(-90, 0) === true, 'latitude exatamente nos limites (90/-90) é válida (limite inclusivo)');

// ======================= 7 — longitude fora do limite ===============================================
check('7', coordenadaValida(0, 181) === false, 'longitude 181 (> 180) inválida');
check('7', coordenadaValida(0, -181) === false, 'longitude -181 (< -180) inválida');
check('7', coordenadaValida(0, 180) === true && coordenadaValida(0, -180) === true, 'longitude exatamente nos limites (180/-180) é válida (limite inclusivo)');

// ======================= 8/9 — motorista A/B isolados (regressão estrutural de RLS) ================
const policiesMotoristaCorridas = (mig0049Src.match(/create policy/g) ?? []).length;
check('8', policiesMotoristaCorridas === 1, 'motorista_corridas continua com EXATAMENTE 1 policy — nenhuma migration/RLS nova nesta fase (Fase 19 não toca em 0049)');
check('8', /motorista_id\s*=\s*(public\.)?current_motorista_id\(\)/.test(mig0049Src), 'a única policy de motorista_corridas usa current_motorista_id() — motorista A nunca vê linha de motorista B por construção (qualquer motorista_id diferente do próprio falha o using())');
check('9', /for all/i.test(mig0049Src), 'a policy é FOR ALL (select/insert/update/delete) — isolamento vale para leitura E escrita, não só leitura');

// ======================= 10/11 — empresa A/B isoladas ================================================
check('10', /empresa_id\s*=\s*(public\.)?current_empresa_id\(\)/.test(mig0003Src), 'veiculos: policy usa empresa_id = current_empresa_id() — empresa A nunca vê veículo de empresa B');
check('10', /empresa_id\s*=\s*(public\.)?current_empresa_id\(\)/.test(mig0004Src), 'motoristas: mesma regra de isolamento por empresa_id');
check('11', /empresa_id\s*=\s*(public\.)?current_empresa_id\(\)/.test(mig0005Src), 'contratos: mesma regra de isolamento por empresa_id — nenhuma das três tabelas foi alterada nesta fase');

// ======================= 12 — staff sem acesso ========================================================
check('12', policiesMotoristaCorridas === 1, 'motorista_corridas: 1 única policy = zero policy de staff (reafirma o achado da auditoria, seção 0 — staff não consegue nem SELECT)');
const policiesMotoristaGanhos = (mig0047Src.match(/create policy/g) ?? []).length;
check('12', policiesMotoristaGanhos >= 1 && !/eh_staff\(\)/.test(mig0047Src.slice(mig0047Src.indexOf('motorista_ganhos'))), 'motorista_ganhos: nenhuma policy referencia eh_staff() — staff continua sem acesso, nada mudou nesta fase');

// ======================= 13 — localização sem dado ====================================================
check('13', distanciaEntrePontos({ latitude: 999, longitude: 0 }, { latitude: 0, longitude: 0 }) === null, 'distanciaEntrePontos com ponto inválido (localização sem dado) → null, nunca uma distância calculada sobre coordenada inventada');
check('13', presencaMotorista(null, agora) === 'SEM_DADO', 'presencaMotorista sem NENHUMA evidência → SEM_DADO');

// ======================= 14 — presença sem localização =================================================
check('14', presencaMotorista(agora - 60_000, agora) === 'ONLINE', 'presencaMotorista calcula o estado só com evidência de atividade (timestamp) — não recebe nem precisa de latitude/longitude para funcionar');
check('14', presencaMotorista.length === 2, 'assinatura da função confirma: (ultimaEvidenciaMs, agoraMs, janelas=padrão) — nenhum parâmetro de localização (o 3º parâmetro tem default, então Function.length conta só os 2 obrigatórios)');

// ======================= 15/16 — histórico ≠ demanda / oportunidade histórica ≠ demanda atual =========
const registrosFixture: RegistroOperacionalFrota[] = [
  { motoristaId: 'm1', data: '2026-08-21', hora: '19:00', valor: 100, duracaoEstimadaMin: 60 },
  { motoristaId: 'm2', data: '2026-08-20', hora: '19:15', valor: 90, duracaoEstimadaMin: 60 },
  { motoristaId: 'm1', data: '2026-08-19', hora: '19:30', valor: 95, duracaoEstimadaMin: 60 },
  { motoristaId: 'm3', data: '2026-08-18', hora: '19:45', valor: 105, duracaoEstimadaMin: 60 },
];
const inteligencia15 = inteligenciaFrotaHistorica(registrosFixture);
const faixa1921 = inteligencia15.porHorario.find((f) => f.label === '18h–21h') as ResumoFrotaFaixaHorario;
check('15', faixa1921 != null && faixa1921.qtdRegistros === 4, 'faixa 18h-21h agrupa os 4 registros do fixture');
const oportunidade16 = oportunidadeOperacional(faixa1921);
check('16', oportunidade16 != null && /não uma indicação de demanda atual/.test(oportunidade16.mensagem), 'oportunidadeOperacional declara explicitamente "não uma indicação de demanda atual"');
check('16', oportunidade16 != null && oportunidade16.origem === 'OPORTUNIDADE HISTORICA', 'origem do insight é OPORTUNIDADE HISTORICA, nunca "demanda"');
const proibidoDemanda = /\bdemanda atual\b(?!.{0,3}não|.{0,40}não uma)/i; // aceita a frase só dentro da negação explícita
check('15', !proibidoDemanda.test(JSON.stringify(inteligencia15)), 'nenhum campo de InteligenciaFrotaHistorica afirma "demanda atual" como fato');

// ======================= 17 — distância correta =========================================================
const dist17 = distanciaEntrePontos({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
check('17', aprox(dist17, 111.19, 0.05), 'OBRIGATÓRIO: 1 grau de longitude no equador ≈ 111,19 km (fórmula de Haversine correta)');
const dist17b = distanciaEntrePontos({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
check('17', aprox(dist17b, 111.19, 0.05), '1 grau de latitude ≈ 111,19 km também (simetria esperada da fórmula)');

// ======================= 18 — mesma coordenada ===========================================================
check('18', distanciaEntrePontos({ latitude: -23.5, longitude: -46.6 }, { latitude: -23.5, longitude: -46.6 }) === 0, 'A → A (mesma coordenada exata) → distância exatamente 0, nunca null');

// ======================= 19 — ausência de histórico =======================================================
const vazio19 = inteligenciaFrotaHistorica([]);
check('19', vazio19.porHorario.length === 0 && vazio19.porDiaSemana.length === 0, 'sem registros → listas vazias, nenhuma faixa/dia inventado');
check('19', vazio19.motoristasUnicosTotal === 0 && vazio19.qtdRegistrosTotal === 0, 'contadores zerados honestamente, nunca null/NaN');

// ======================= 20 — ausência de dados suficientes ===============================================
const registroUnico20: RegistroOperacionalFrota[] = [{ motoristaId: 'm1', data: '2026-08-21', hora: '10:00', valor: 50, duracaoEstimadaMin: 30 }];
const inteligencia20 = inteligenciaFrotaHistorica(registroUnico20);
const faixa20 = inteligencia20.porHorario.find((f) => f.label === '09h–12h') as ResumoFrotaFaixaHorario;
check('20', faixa20 != null && faixa20.classificacaoAmostra === 'dados_insuficientes', '1 registro → classificacaoAmostra dados_insuficientes (limiar reusado de classificarAmostra, Fase 17)');
check('20', oportunidadeOperacional(faixa20) === null, 'oportunidadeOperacional NUNCA gera insight sobre amostra insuficiente — retorna null');

// ======================= 21/22 — Uber/99 não integrados ===================================================
const grepUberNa99 = (pattern: RegExp) => {
  // Verifica só os arquivos desta fase + o motor de corridas — não varre node_modules/dist.
  return pattern.test(todosArquivosNovosSrc) || pattern.test(readFileSync(join(raizFonte, 'src/features/motorista-app/lib/metas.ts'), 'utf8'));
};
check('21', !grepUberNa99(/api\.uber\.com|uber-api|UBER_API_KEY/i), 'nenhuma integração com API da Uber em nenhum arquivo desta fase ou do motor de corridas');
check('22', !grepUberNa99(/api\.99\w*\.com|NOVENTA_E_NOVE_API|API_99/i), 'nenhuma integração com API da 99 em nenhum arquivo desta fase');

// ======================= 23 — nenhuma coordenada inventada ================================================
check('23', r2.posicao === null && r3?.posicao === null && r4.posicao === null && r5.posicao === null, 'em TODOS os ramos de erro/indisponibilidade, posicao é null — nunca {latitude:0,longitude:0} como fallback');
check('23', !/latitude:\s*0\s*,\s*longitude:\s*0/.test(todosArquivosNovosSrc), 'nenhum arquivo novo contém um literal {latitude:0, longitude:0} como valor de fallback');

// ======================= 24 — nenhum motor duplicado ======================================================
const inteligenciaFrotaSrc = readFileSync(join(raizFonte, 'src/features/frota/lib/inteligenciaFrota.ts'), 'utf8');
check('24', /import\s*\{[\s\S]{0,200}classificarAmostra[\s\S]{0,200}\}\s*from\s*'@\/features\/motorista-app\/lib\/metas'/.test(inteligenciaFrotaSrc), 'inteligenciaFrota.ts IMPORTA classificarAmostra do motor da Fase 17 — não redefine os limiares 3/7/14');
check('24', /import\s*\{[\s\S]{0,200}FAIXAS_HORARIO[\s\S]{0,200}\}\s*from\s*'@\/features\/motorista-app\/lib\/metas'/.test(inteligenciaFrotaSrc), 'inteligenciaFrota.ts IMPORTA FAIXAS_HORARIO do motor da Fase 17 — não redefine as 7 faixas');
check('24', !/const FAIXAS_HORARIO|function classificarAmostra/.test(inteligenciaFrotaSrc), 'inteligenciaFrota.ts não redeclara FAIXAS_HORARIO nem classificarAmostra localmente');
const geoSrc = readFileSync(join(raizFonte, 'src/features/frota/lib/geo.ts'), 'utf8');
check('24', /import\s*\{\s*coordenadaValida\s*\}\s*from\s*'@\/features\/motorista-app\/lib\/localizacao'/.test(geoSrc), 'geo.ts IMPORTA coordenadaValida em vez de reimplementar a validação de limites geográficos');

// ======================= 25 — nenhum dashboard duplicado ===================================================
const frotaPageSrc = readFileSync(join(raizFonte, 'src/features/frota/pages/FrotaPage.tsx'), 'utf8');
check('25', /tab.*inteligencia|inteligencia.*tab/is.test(frotaPageSrc) || /Inteligência da Frota/.test(frotaPageSrc), 'a tab "Inteligência da Frota" já existente em FrotaPage.tsx continua sendo o único ponto de entrada — Fase 19 não criou uma segunda rota/tela');
const routerSrc = readFileSync(join(raizFonte, 'src/app/router/router.tsx'), 'utf8');
check('25', !/frota\/inteligencia/i.test(routerSrc), 'nenhuma rota nova /frota/inteligencia foi registrada — Módulo 6 desta fase é arquitetura, não UI');

// ======================= 26 — nenhuma query duplicada (nenhuma query nova, ponto) ==========================
check('26', !/supabase\.from\(|\.select\(\s*['"`]/.test(todosArquivosNovosSrc), 'nenhum dos 6 arquivos novos desta fase chama supabase.from(...)/.select(...) — motor 100% puro + hooks client-only, zero query nova');
check('26', srcInteiro.length > 0, 'sanity check: leitura de src/ funcionou (evita falso-positivo silencioso na contagem acima)');

// ======================= relatório ================================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-motorista-inteligencia-frota: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
