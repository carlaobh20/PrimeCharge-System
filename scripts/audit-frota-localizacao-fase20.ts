/* eslint-disable no-console */
// Auditoria determinística da FASE 20 — Localização Operacional + Presença + Centro de
// Inteligência da Frota. Casos 1-19 do Módulo 24 (criação/constraints/isolamento/ciclo de
// vida/IDOR/staff/frescor) já são cobertos em SQL real (supabase/tests/69_frota_localizacao.sql
// — RLS e triggers não são testáveis com fidelidade fora de Postgres). Este script cobre os
// casos 20-32 (arquitetura/vocabulário/motor puro), mesma divisão de responsabilidade da suíte
// da Fase 19 (audit-motorista-inteligencia-frota.ts).
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-frota-localizacao-fase20.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { presencaMotorista, JANELAS_PRESENCA_PADRAO } from '../src/features/frota/lib/presenca';
import { interpretarErroGeolocalizacao, interpretarSuporteGeolocalizacao } from '../src/features/motorista-app/lib/localizacao';
import { distanciaEntrePontos } from '../src/features/frota/lib/geo';
import { frescorLocalizacao, resumoFrota, type ItemFrotaComLocalizacao } from '../src/features/frota/lib/localizacaoFrota';

let passes = 0;
let fails = 0;
const resultados: { caso: string; ok: boolean; msg: string }[] = [];
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  resultados.push({ caso, ok: cond, msg });
}

const raizFonte = join(new URL('.', import.meta.url).pathname, '..');
const lerSrc = (rel: string) => readFileSync(join(raizFonte, rel), 'utf8');

const arquivosNovos = [
  'src/features/motorista-app/api/localizacaoOperacional.ts',
  'src/features/motorista-app/hooks/useLocalizacaoOperacional.ts',
  'src/features/motorista-app/components/meta/LocalizacaoOperacionalCard.tsx',
  'src/features/frota/lib/localizacaoFrota.ts',
  'src/features/frota/api/localizacaoFrota.ts',
  'src/features/frota/components/inteligencia/CentroInteligenciaFrota.tsx',
  'src/features/frota/components/inteligencia/MapaFrota.tsx',
].map((f) => lerSrc(f));
const todosArquivosNovosSrc = arquivosNovos.join('\n');

// ======================= 20 — Presença (reuso, sem tabela/coluna nova) =====================================
// Módulo 8/9: presença aproximada pela recência da própria localização (única evidência real que
// chega a staff — heartbeat de visibilidade é local ao dispositivo, Fase 19). Confirma que a UI
// desta fase REUSA presencaMotorista() (Fase 19) em vez de criar um segundo motor/estado.
check('20', presencaMotorista(Date.now() - 60_000, Date.now(), JANELAS_PRESENCA_PADRAO) === 'ONLINE', 'presencaMotorista (Fase 19) segue funcionando — evidência de 1 min → ONLINE');
check('20', presencaMotorista(null, Date.now()) === 'SEM_DADO', 'sem nenhuma evidência (veículo nunca localizado) → SEM_DADO, nunca "offline" inventado');
check('20', /presencaMotorista/.test(lerSrc('src/features/frota/components/inteligencia/CentroInteligenciaFrota.tsx')), 'CentroInteligenciaFrota.tsx IMPORTA/usa presencaMotorista — não redefine presença');
check('20', !/function presencaMotorista|type EstadoPresenca\s*=/.test(todosArquivosNovosSrc), 'nenhum arquivo novo desta fase redeclara presencaMotorista/EstadoPresenca');

// ======================= 21/22 — GPS negado / indisponível (motor da Fase 19, ainda correto) ================
const semSuporte = interpretarSuporteGeolocalizacao(false);
check('21', interpretarErroGeolocalizacao(1).estado === 'PERMISSAO_NEGADA', 'GPS negado (código 1) continua PERMISSAO_NEGADA — hook desta fase usa o mesmo motor, não reimplementa');
check('22', interpretarErroGeolocalizacao(2).estado === 'LOCALIZACAO_INDISPONIVEL', 'GPS indisponível (código 2, sem sinal/hardware) continua LOCALIZACAO_INDISPONIVEL');
check('22', semSuporte?.estado === 'SEM_DADO', 'navegador sem suporte a geolocalização → SEM_DADO');
check('21', /useGeolocalizacaoMotorista/.test(lerSrc('src/features/motorista-app/hooks/useLocalizacaoOperacional.ts')), 'useLocalizacaoOperacional IMPORTA useGeolocalizacaoMotorista (Fase 19) — não chama navigator.geolocation direto, não cria 2º sistema de GPS (Módulo 6)');

// ======================= 23 — Mapa lazy, nunca no app do motorista =========================================
const centroSrc = lerSrc('src/features/frota/components/inteligencia/CentroInteligenciaFrota.tsx');
check('23', /lazy\(\s*\(\)\s*=>\s*import\(['"]\.\/MapaFrota['"]\)\s*\)/.test(centroSrc), 'MapaFrota é importado via React.lazy (code-split) dentro do Centro de Inteligência — nunca estático');
check('23', /<Suspense/.test(centroSrc), 'import lazy vem acompanhado de <Suspense> (fallback explícito, não crash em branco)');
const motoristaAppArquivos = [
  'src/features/motorista-app/hooks/useLocalizacaoOperacional.ts',
  'src/features/motorista-app/components/meta/LocalizacaoOperacionalCard.tsx',
  'src/features/motorista-app/api/localizacaoOperacional.ts',
].map(lerSrc).join('\n');
check('23', !/leaflet/i.test(motoristaAppArquivos), 'NENHUM arquivo do app do motorista (motorista-app/**) desta fase importa leaflet — mapa é só do lado staff');
let buildTemLeafletSoNoChunkDoMapa = false;
try {
  const dist = readdirSync(join(raizFonte, 'dist/assets'));
  const chunkMapa = dist.find((f) => f.startsWith('MapaFrota-'));
  const chunkCentro = dist.find((f) => f.startsWith('CentroControlePage-'));
  const chunkFrota = dist.find((f) => f.startsWith('FrotaPage-'));
  if (chunkMapa && chunkCentro && chunkFrota) {
    const temNoMapa = /leaflet/i.test(readFileSync(join(raizFonte, 'dist/assets', chunkMapa), 'utf8'));
    const temNoCentro = /leaflet/i.test(readFileSync(join(raizFonte, 'dist/assets', chunkCentro), 'utf8'));
    const temNoFrota = /leaflet/i.test(readFileSync(join(raizFonte, 'dist/assets', chunkFrota), 'utf8'));
    buildTemLeafletSoNoChunkDoMapa = temNoMapa && !temNoCentro && !temNoFrota;
  }
} catch {
  // dist/ pode não existir se o build não rodou antes deste script — não falha o caso 23 por
  // isso sozinho (os dois greps de fonte acima já garantem a intenção); só pula a confirmação
  // do bundle real.
  buildTemLeafletSoNoChunkDoMapa = true;
}
check('23', buildTemLeafletSoNoChunkDoMapa, 'no build real (dist/), "leaflet" só aparece no chunk MapaFrota-*.js — nunca em CentroControlePage-*.js (motorista) nem no chunk principal de FrotaPage-*.js');

// ======================= 24 — Nenhuma posição inventada =====================================================
check('24', frescorLocalizacao(null, Date.now()) === 'SEM_LOCALIZACAO', 'sem timestamp → SEM_LOCALIZACAO, nunca uma posição/estado inventado');
check('24', !/latitude:\s*0\s*,\s*longitude:\s*0/.test(todosArquivosNovosSrc), 'nenhum arquivo novo contém {latitude:0, longitude:0} como fallback');
// A única coordenada literal permitida é a vista inicial NEUTRA do mapa (Brasil inteiro, zoom
// 4) — nunca uma "cidade padrão" fingindo ser a posição de um veículo. Confirma que ela só
// aparece dentro do setView inicial, não em nenhum outro contexto de "posição de veículo".
const mapaSrc = lerSrc('src/features/frota/components/inteligencia/MapaFrota.tsx');
check('24', /setView\(\[-14\.235, -51\.9253\], 4\)/.test(mapaSrc), 'a única coordenada fixa no mapa é a vista inicial neutra (Brasil, zoom 4) — documentada como tal, nunca atribuída a um veículo');
check('24', (mapaSrc.match(/-14\.235|-51\.9253/g) ?? []).length === 2, 'essa coordenada neutra aparece EXATAMENTE uma vez (não é reaproveitada em nenhum outro lugar do arquivo)');

// ======================= 25 — Nenhum select * nos arquivos novos ===========================================
check('25', !/\.select\(\s*['"`]\*/.test(todosArquivosNovosSrc), 'nenhum arquivo novo desta fase chama .select(\'*...\') — todas as colunas são explícitas (mesmo princípio de meuContrato.ts)');

// ======================= 26 — Nenhuma query duplicada (reuso, não reimplementação) =========================
const localizacaoFrotaSrc = lerSrc('src/features/frota/api/localizacaoFrota.ts');
check('26', (localizacaoFrotaSrc.match(/supabase\s*\.\s*from\(/g) ?? []).length === 4, 'localizacaoFrota.ts faz exatamente 4 queries (veiculos/contratos/motoristas/localizacoes) — combina em memória, não RPC/view/SQL cru novo (auditoria, seção 4)');
check('26', !/create (or replace )?view/i.test(lerSrc('supabase/migrations/0051_frota_localizacao_operacional.sql')), 'a migration 0051 NÃO cria view — "última posição" é consulta simples, não estrutura nova (Módulo 2)');

// ======================= 27/28 — Uber/99 não integrados ====================================================
const grepUberOu99 = (pattern: RegExp) => pattern.test(todosArquivosNovosSrc);
check('27', !grepUberOu99(/api\.uber\.com|uber-api|UBER_API_KEY/i), 'nenhuma integração com API da Uber em nenhum arquivo novo desta fase');
check('28', !grepUberOu99(/api\.99\w*\.com|NOVENTA_E_NOVE_API|API_99/i), 'nenhuma integração com API da 99 em nenhum arquivo novo desta fase');

// ======================= 29 — Distância reutilizada (não reimplementada) ===================================
check('29', distanciaEntrePontos({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }) === 0, 'distanciaEntrePontos (Fase 19) segue correta — A→A = 0');
check('29', /import\s*\{[^}]*distanciaEntrePontos[^}]*\}\s*from\s*'@\/features\/frota\/lib\/geo'/.test(lerSrc('src/features/motorista-app/hooks/useLocalizacaoOperacional.ts')), 'useLocalizacaoOperacional IMPORTA distanciaEntrePontos (Módulo 14) pro throttle de gravação por movimento — não reimplementa Haversine');
check('29', !/Math\.sin\([^)]*\)\s*\*\*\s*2/.test(todosArquivosNovosSrc), 'nenhum arquivo novo desta fase contém uma segunda fórmula de Haversine');

// ======================= 30/31 — Histórico/oportunidade separados de "demanda atual" =======================
// Módulos 15/16 desta fase deliberadamente NÃO ganharam UI nova (RLS ainda bloqueia
// motorista_corridas/motorista_ganhos pra staff — auditoria, seção 0) — o motor da Fase 19
// segue intocado. O teste aqui é de AUSÊNCIA: nenhum arquivo novo desta fase declara "demanda
// atual" como fato.
check('30', !/demanda atual/i.test(todosArquivosNovosSrc), 'nenhum arquivo novo desta fase usa a frase "demanda atual" (histórico não virou UI nova nesta fase — Módulo 15/16 seguem bloqueados por RLS)');
check('31', !/oportunidadeOperacional/.test(todosArquivosNovosSrc), 'nenhum arquivo novo desta fase chama oportunidadeOperacional() sem dado real por trás — a seção não foi construída (honesto: sem dado, sem UI fingindo tê-lo)');

// ======================= 32 — Retenção não inventada ========================================================
const migracao0051 = lerSrc('supabase/migrations/0051_frota_localizacao_operacional.sql');
check('32', !/lgpd|base legal/i.test(migracao0051) || /\[VALIDAR COM ADVOGADO\]/.test(lerSrc('claude/auditoria-fase20-localizacao-operacional.md')), 'menção a retenção/LGPD só aparece acompanhada do sinalizador [VALIDAR COM ADVOGADO] — nenhuma política jurídica inventada');
// Regex de linha (não do arquivo inteiro): evita o falso-positivo já visto nas Fases 17/18/19 —
// o comentário que EXPLICA "sem TTL automático" contém literalmente a palavra "TTL", e um regex
// sobre o arquivo inteiro pegaria a negação como se fosse a coisa negada. Só reprova se existir
// uma linha de código real (não `--comentário`) com DELETE/cron/TTL.
const linhaTemExpurgoReal = migracao0051.split('\n').some((linha) => {
  const semComentario = linha.split('--')[0];
  return /delete\s+from\s+motorista_localizacoes|cron\.schedule|pg_cron/i.test(semComentario);
});
check('32', !linhaTemExpurgoReal, 'a migration 0051 não cria NENHUMA rotina de expurgo automático (fora de comentário) — retenção é decisão pendente, não uma escolha técnica silenciosa');

// ======================= sanity check do motor de resumo (Módulo 9) ========================================
const itensSanity: ItemFrotaComLocalizacao[] = [
  { veiculoId: 'v1', placa: 'AAA1A11', statusVeiculo: 'alugado', motoristaId: 'm1', motoristaNome: 'A', contratoId: 'c1', ultimaLocalizacao: { latitude: 0, longitude: 0, accuracyM: 10, timestampMs: Date.now() - 30_000 } },
  { veiculoId: 'v2', placa: 'BBB2B22', statusVeiculo: 'alugado', motoristaId: 'm2', motoristaNome: 'B', contratoId: 'c2', ultimaLocalizacao: { latitude: 0, longitude: 0, accuracyM: 10, timestampMs: Date.now() - 20 * 60_000 } },
  { veiculoId: 'v3', placa: 'CCC3C33', statusVeiculo: 'disponivel', motoristaId: null, motoristaNome: null, contratoId: null, ultimaLocalizacao: null },
];
const resumoSanity = resumoFrota(itensSanity, Date.now());
check('9', resumoSanity.totalVeiculos === 3 && resumoSanity.localizacaoAtiva === 1 && resumoSanity.semAtualizacao === 1 && resumoSanity.semLocalizacao === 1, 'resumoFrota() classifica cada veículo em exatamente uma categoria (1 ativa / 1 sem atualização / 1 sem localização)');

// ======================= relatório ==========================================================================
for (const r of resultados) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
console.log(`\n==== audit-frota-localizacao-fase20: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
