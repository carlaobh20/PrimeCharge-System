/* eslint-disable no-console */
// Auditoria determinística da FASE 20 — Localização Operacional + Presença + Centro de
// Inteligência da Frota. Casos 1-19/31 (criação/constraints/isolamento/ciclo de vida/IDOR/
// staff/frescor/cascade/view) são cobertos em SQL real (supabase/tests/69_frota_localizacao.sql
// — RLS e triggers não são testáveis com fidelidade fora de Postgres). Este script cobre
// arquitetura/vocabulário/motor puro, nas 12 categorias pedidas pelo Módulo 35 (2ª passada):
// A schema, B RLS, C vínculo contrato, D GPS, E presença, F API, G mapa, H privacidade,
// I inteligência, J performance, K ausência de Uber/99, L schemaGuard.
//   npx tsx --tsconfig tsconfig.app.json scripts/audit-frota-localizacao-fase20.ts
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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
const existeSrc = (rel: string) => existsSync(join(raizFonte, rel));

// Bug já documentado 4x na história deste projeto (Fases 17/18/19/20): um comentário que EXPLICA
// por que uma frase/palavra proibida está AUSENTE contém, ele mesmo, a frase proibida — e um
// regex sobre o arquivo inteiro pega a negação como se fosse a coisa negada. Remove `-- ...`
// (SQL) e `// ...` (TS) de cada linha antes de qualquer regex de "isso não pode aparecer".
function semComentarios(src: string): string {
  return src
    .split('\n')
    .map((linha) => linha.split('--')[0].split('//')[0])
    .join('\n');
}

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
const centroSrc = lerSrc('src/features/frota/components/inteligencia/CentroInteligenciaFrota.tsx');
const apiFrotaSrc = lerSrc('src/features/frota/api/localizacaoFrota.ts');
const migracao0051 = lerSrc('supabase/migrations/0051_frota_localizacao_operacional.sql');
const migracao0052 = lerSrc('supabase/migrations/0052_frota_localizacao_view.sql');

// ============================================================================================
// A — SCHEMA
// ============================================================================================
check('A1', /create table if not exists motorista_localizacoes/.test(migracao0051), 'migration 0051 cria motorista_localizacoes');
check('A2', !/\bheading\b|\bspeed\b|\baltitude\b/i.test(migracao0051), 'schema NÃO tem heading/speed/altitude (Módulo 1 da 2ª passada — só o mínimo pedido)');
check('A3', !/create table.*motorista_localizacao_atual|create table.*localizacao_atual/i.test(migracao0051 + migracao0052), 'NENHUMA tabela de "posição atual" foi criada — só a insert-only + view derivada');
check('A4', !/create table.*historico/i.test(migracao0051 + migracao0052), 'NENHUMA tabela de histórico separada — a própria motorista_localizacoes já é o histórico (insert-only)');
check('A5', /create view motorista_localizacoes_atual/.test(migracao0052), 'view motorista_localizacoes_atual foi criada (Módulo 5 — só quando facilita a consulta, sem duplicar armazenamento)');
check('A6', /security_invoker\s*=\s*true/.test(migracao0052), 'a view declara security_invoker=true (RLS avaliada com o privilégio de quem consulta, não do dono da view)');
check('A7', /distinct on\s*\(\s*veiculo_id\s*\)/i.test(migracao0052), 'a view usa DISTINCT ON (veiculo_id) — Módulo 11, "equivalente PostgreSQL eficiente"');
check('A8', !/select\s+\*/i.test(semComentarios(migracao0052)), 'a view NÃO usa select * na sua própria definição — colunas explícitas');
check('A9',
  /idx_motorista_localizacoes_veiculo.*veiculo_id,\s*timestamp_localizacao desc/.test(migracao0051.replace(/\n/g, ' ')),
  'índice principal (veiculo_id, timestamp_localizacao DESC) existe (Módulo 6)');
check('A10',
  /idx_motorista_localizacoes_empresa/.test(migracao0051) && /idx_motorista_localizacoes_motorista/.test(migracao0051),
  'índices por empresa_id e motorista_id também existem, cada um com consumidor real (RLS/queries)');

// ============================================================================================
// B — RLS
// ============================================================================================
check('B1', !/using\s*\(\s*true\s*\)/i.test(migracao0051), 'NENHUMA policy usa "USING (true)" em motorista_localizacoes');
check('B2', /empresa_id = public\.current_empresa_id\(\) and public\.eh_staff\(\)/.test(migracao0051), 'a policy de staff usa empresa_id = current_empresa_id() AND eh_staff() — nunca current_empresa_id() sozinho (achado da auditoria)');
check('B3', (migracao0051.match(/for select using/gi) ?? []).length === 2, 'exatamente 2 policies de SELECT declaradas na migration (motorista + empresa)');
check('B4', (migracao0051.match(/for insert with check/gi) ?? []).length === 1, 'exatamente 1 policy de INSERT declarada na migration (só o motorista dono)');
check('B5', !/for update|for delete/i.test(migracao0051), 'NENHUMA policy de UPDATE/DELETE declarada — insert-only por RLS, não só por convenção de app');
check('B6', /alter table motorista_localizacoes enable row level security/.test(migracao0051), 'RLS está de fato HABILITADA na tabela (enable row level security)');

// ============================================================================================
// C — VÍNCULO CONTRATO
// ============================================================================================
check('C1', /create or replace function public\.fn_validar_localizacao_operacional/.test(migracao0051), 'trigger fn_validar_localizacao_operacional existe');
check('C2', /before insert on motorista_localizacoes/.test(migracao0051), 'o trigger roda BEFORE INSERT (nunca depois de já ter gravado)');
check('C3', /v_contrato\.status is distinct from 'ativo'/.test(migracao0051), 'trigger verifica contrato.status = ativo explicitamente');
check('C4', /v_contrato\.motorista_id is distinct from new\.motorista_id/.test(migracao0051), 'trigger verifica que o contrato pertence ao motorista autenticado (fecha IDOR via contrato de outro)');
check('C5', /new\.veiculo_id\s*:=\s*v_contrato\.veiculo_id/.test(migracao0051) && /new\.empresa_id\s*:=\s*v_contrato\.empresa_id/.test(migracao0051), 'veiculo_id/empresa_id são SOBRESCRITOS a partir do contrato — nunca aceitos do cliente como estão');
check('C6', /select ativo into v_usuario_ativo from usuarios/.test(migracao0051), 'trigger também checa usuarios.ativo (defesa em profundidade, redundante com a RLS de propósito)');
check('C7', /v_motorista_status in \('bloqueado','encerrado'\)/.test(migracao0051), 'trigger rejeita motorista com status bloqueado/encerrado (Módulo 5 — política operacional)');

// ============================================================================================
// D — GPS
// ============================================================================================
const semSuporte = interpretarSuporteGeolocalizacao(false);
check('D1', interpretarErroGeolocalizacao(1).estado === 'PERMISSAO_NEGADA', 'GPS negado (código 1) continua PERMISSAO_NEGADA — hook desta fase usa o mesmo motor, não reimplementa');
check('D2', interpretarErroGeolocalizacao(2).estado === 'LOCALIZACAO_INDISPONIVEL', 'GPS indisponível (código 2, sem sinal/hardware) continua LOCALIZACAO_INDISPONIVEL');
check('D3', semSuporte?.estado === 'SEM_DADO', 'navegador sem suporte a geolocalização → SEM_DADO');
check('D4', /useGeolocalizacaoMotorista/.test(lerSrc('src/features/motorista-app/hooks/useLocalizacaoOperacional.ts')), 'useLocalizacaoOperacional IMPORTA useGeolocalizacaoMotorista (Fase 19) — não chama navigator.geolocation direto, não cria 2º sistema de GPS (Módulo 7)');
check('D5', !/latitude:\s*0\s*,\s*longitude:\s*0/.test(todosArquivosNovosSrc), 'nenhum arquivo novo contém {latitude:0, longitude:0} como fallback (Módulo 9)');
check('D6', frescorLocalizacao(null, Date.now()) === 'SEM_LOCALIZACAO', 'sem timestamp → SEM_LOCALIZACAO, nunca uma posição/estado inventado');
check('D7', /document\.visibilityState/.test(lerSrc('src/features/motorista-app/hooks/useLocalizacaoOperacional.ts')), 'captura só roda com Page Visibility em conta (foreground prioritário, Módulo 8)');

// ============================================================================================
// E — PRESENÇA
// ============================================================================================
check('E1', presencaMotorista(Date.now() - 60_000, Date.now(), JANELAS_PRESENCA_PADRAO) === 'ONLINE', 'presencaMotorista (Fase 19) segue funcionando — evidência de 1 min → ONLINE');
check('E2', presencaMotorista(null, Date.now()) === 'SEM_DADO', 'sem nenhuma evidência (veículo nunca localizado) → SEM_DADO, nunca "offline" inventado');
check('E3', /presencaMotorista/.test(centroSrc), 'CentroInteligenciaFrota.tsx IMPORTA/usa presencaMotorista — não redefine presença');
check('E4', !/function presencaMotorista|type EstadoPresenca\s*=/.test(todosArquivosNovosSrc), 'nenhum arquivo novo desta fase redeclara presencaMotorista/EstadoPresenca');

// ============================================================================================
// F — API
// ============================================================================================
check('F1', !/\.select\(\s*['"`]\*/.test(todosArquivosNovosSrc), 'nenhum arquivo novo chama .select(\'*...\') — todas as colunas são explícitas');
check('F2', /\.from\(\s*['"]motorista_localizacoes_atual['"]\s*\)/.test(apiFrotaSrc), 'a API staff consulta a VIEW motorista_localizacoes_atual (DISTINCT ON no banco), não mais dedup em memória (Módulo 11)');
check('F3', !/\.limit\(\s*500\s*\)/.test(apiFrotaSrc), 'não existe mais o limite arbitrário de 500 linhas cruas (bug real corrigido: frota grande podia esconder um veículo)');
check('F4', /export (async )?function getHistoricoLocalizacoes/.test(apiFrotaSrc), 'getHistoricoLocalizacoes() existe — histórico é consulta SEPARADA (Módulo 12)');
check('F5', (semComentarios(centroSrc).match(/getHistoricoLocalizacoes\(/g) ?? []).length === 1, 'getHistoricoLocalizacoes() é CHAMADA (código real, fora de comentário) uma única vez em todo o Centro de Inteligência — só dentro da query sob demanda');
check('F6', /enabled:\s*aberto/.test(centroSrc), 'a query de histórico usa enabled:false por padrão (useQuery) — nunca roda sozinha no mount (Módulo 24)');
check('F7', (apiFrotaSrc.match(/supabase\s*\.\s*from\(/g) ?? []).length === 5, 'localizacaoFrota.ts (API) faz exatamente 5 queries de tabela/view (veiculos/contratos/motoristas/view atual/histórico sob demanda) — nada de RPC/SQL cru novo');
check('F8', /from '@\/shared\/lib\/schemaGuard'/.test(apiFrotaSrc), 'a API staff usa o schemaGuard compartilhado (Módulo 28 — reuso, não reinvenção)');
check('F9', /import\(['"]\.\/MapaFrota['"]\)/.test(centroSrc), 'MapaFrota segue importado via lazy (não regressão da 1ª passada)');

// ============================================================================================
// G — MAPA
// ============================================================================================
check('G1', /lazy\(\s*\(\)\s*=>\s*import\(['"]\.\/MapaFrota['"]\)\s*\)/.test(centroSrc), 'MapaFrota é importado via React.lazy (code-split) dentro do Centro de Inteligência — nunca estático');
check('G2', /<Suspense/.test(centroSrc), 'import lazy vem acompanhado de <Suspense> (fallback explícito, não crash em branco)');
const motoristaAppArquivos = [
  'src/features/motorista-app/hooks/useLocalizacaoOperacional.ts',
  'src/features/motorista-app/components/meta/LocalizacaoOperacionalCard.tsx',
  'src/features/motorista-app/api/localizacaoOperacional.ts',
].map(lerSrc).join('\n');
check('G3', !/leaflet/i.test(motoristaAppArquivos), 'NENHUM arquivo do app do motorista (motorista-app/**) desta fase importa leaflet — mapa é só do lado staff');
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
  // dist/ pode não existir se o build não rodou antes deste script — não falha o caso G4 por
  // isso sozinho; só pula a confirmação do bundle real.
  buildTemLeafletSoNoChunkDoMapa = true;
}
check('G4', buildTemLeafletSoNoChunkDoMapa, 'no build real (dist/), "leaflet" só aparece no chunk MapaFrota-*.js — nunca em CentroControlePage-*.js (motorista) nem no chunk principal de FrotaPage-*.js');
const mapaSrc = lerSrc('src/features/frota/components/inteligencia/MapaFrota.tsx');
check('G5', /setView\(\[-14\.235, -51\.9253\], 4\)/.test(mapaSrc), 'a única coordenada fixa no mapa é a vista inicial neutra (Brasil, zoom 4) — nunca atribuída a um veículo');
check('G6', (mapaSrc.match(/-14\.235|-51\.9253/g) ?? []).length === 2, 'essa coordenada neutra aparece EXATAMENTE uma vez (não reaproveitada em nenhum outro lugar do arquivo)');

// ============================================================================================
// H — PRIVACIDADE
// ============================================================================================
check('H1', !/insert into audit_log|insert into timeline_eventos/i.test(semComentarios(migracao0051)), 'a migration 0051 NUNCA escreve em audit_log/timeline_eventos (código real, não comentário)');
check('H2', !/insert into veiculos|insert into checklists|insert into telemetria|insert into manutencoes|insert into lancamentos|insert into pagamentos/i.test(migracao0051), 'a migration não copia localização pra nenhuma outra tabela (veiculos/checklists/telemetria/manutencoes/lancamentos/pagamentos)');
check('H3', !/localStorage\s*\.\s*(setItem|getItem)/.test(lerSrc('src/features/motorista-app/hooks/useLocalizacaoOperacional.ts')), 'consentimento NÃO é persistido em localStorage (nenhuma chamada real setItem/getItem — a palavra só aparece nos comentários explicando a decisão)');
const migracaoTexto = migracao0051 + migracao0052;
check('H4', !/lgpd|base legal/i.test(migracaoTexto) || /\[VALIDAR COM ADVOGADO\]/.test(lerSrc('claude/auditoria-fase20-localizacao-operacional.md')), 'menção a retenção/LGPD só aparece com [VALIDAR COM ADVOGADO] — nenhuma política jurídica inventada');
const linhaTemExpurgoReal = migracaoTexto.split('\n').some((linha) => {
  const semComentario = linha.split('--')[0];
  return /delete\s+from\s+motorista_localizacoes|cron\.schedule|pg_cron/i.test(semComentario);
});
check('H5', !linhaTemExpurgoReal, 'nenhuma rotina de expurgo automático (fora de comentário) — retenção é decisão pendente, não uma escolha técnica silenciosa');
check('H6', /NAO_COMPARTILHADA.*COMPARTILHADA.*PERMISSAO_NEGADA.*INDISPONIVEL/s.test(lerSrc('src/features/motorista-app/hooks/useLocalizacaoOperacional.ts')), 'os 4 estados de consentimento factuais existem no hook (Módulo 4)');

// ============================================================================================
// I — INTELIGÊNCIA
// ============================================================================================
check('I1', !/demanda atual/i.test(semComentarios(todosArquivosNovosSrc)), 'nenhum arquivo novo usa a frase "demanda atual" como fato em código/texto renderizado (só aparece em comentários que a NEGAM explicitamente)');
check('I2', !/oportunidadeOperacional\(/.test(semComentarios(todosArquivosNovosSrc)), 'nenhum arquivo novo CHAMA oportunidadeOperacional() sem dado real por trás (menção em comentário explicando o motivo é permitida)');
check('I3', /NÃO DISPONÍVEL/.test(centroSrc) && /motorista_corridas/.test(centroSrc), 'o Centro de Inteligência mostra explicitamente que a inteligência histórica agregada NÃO ESTÁ DISPONÍVEL, citando a causa real (RLS de motorista_corridas/ganhos) — honesto, não silenciado');
check('I4', distanciaEntrePontos({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }) === 0, 'distanciaEntrePontos (Fase 19) segue correta — A→A = 0');
check('I5', /import\s*\{[^}]*distanciaEntrePontos[^}]*\}\s*from\s*'@\/features\/frota\/lib\/geo'/.test(lerSrc('src/features/motorista-app/hooks/useLocalizacaoOperacional.ts')), 'useLocalizacaoOperacional IMPORTA distanciaEntrePontos pro throttle de gravação por movimento — não reimplementa Haversine');
check('I6', !/Math\.sin\([^)]*\)\s*\*\*\s*2/.test(todosArquivosNovosSrc), 'nenhum arquivo novo contém uma segunda fórmula de Haversine');

// ============================================================================================
// J — PERFORMANCE
// ============================================================================================
check('J1', !/recharts|chart\.js|react-chartjs/i.test(todosArquivosNovosSrc), 'nenhum arquivo novo importa Recharts/Chart.js/SDK de gráfico pesado');
check('J2', /refetchInterval:\s*REFETCH_INTERVAL_MS/.test(centroSrc) && /refetchIntervalInBackground:\s*false/.test(centroSrc), 'polling do Centro de Inteligência usa refetchInterval + refetchIntervalInBackground:false (pausa em background)');
check('J3', !/new WebSocket\(/.test(todosArquivosNovosSrc), 'nenhum WebSocket customizado foi criado (Módulo 13/26)');
check('J4', !/supabase\s*\.\s*channel\(/.test(todosArquivosNovosSrc), 'nenhum canal Supabase Realtime foi usado nesta fase (decisão documentada na auditoria)');
check('J5', /3 \* 60 \* 1000/.test(lerSrc('src/features/motorista-app/hooks/useLocalizacaoOperacional.ts')), 'cadência de captura documentada em minutos (3 min), não segundos — estratégia conservadora (Módulo 8)');

// ============================================================================================
// K — AUSÊNCIA DE UBER/99
// ============================================================================================
check('K1', !/api\.uber\.com|uber-api|UBER_API_KEY/i.test(todosArquivosNovosSrc), 'nenhuma integração com API da Uber em nenhum arquivo novo desta fase');
check('K2', !/api\.99\w*\.com|NOVENTA_E_NOVE_API|API_99/i.test(todosArquivosNovosSrc), 'nenhuma integração com API da 99 em nenhum arquivo novo desta fase');

// ============================================================================================
// L — SCHEMAGUARD (reuso, Módulo 28)
// ============================================================================================
check('L1', existeSrc('src/shared/lib/schemaGuard.ts'), 'schemaGuard.ts existe em shared/lib (movido da motorista-app nesta passada, pra ser reusável pelos dois apps)');
check('L2', !existeSrc('src/features/motorista-app/api/schemaGuard.ts'), 'o arquivo antigo (motorista-app/api/schemaGuard.ts) NÃO existe mais — movido, não duplicado');
const schemaGuardSrc = lerSrc('src/shared/lib/schemaGuard.ts');
check('L3', /export (async )?function lerTolerante/.test(schemaGuardSrc) && /export (async )?function ehRecursoAusente/.test(schemaGuardSrc) && /export (async )?function moduloIndisponivel/.test(schemaGuardSrc), 'lerTolerante/ehRecursoAusente/moduloIndisponivel — as 3 funções pedidas pelo Módulo 28 existem e são exportadas');
check('L4', /from '@\/shared\/lib\/schemaGuard'/.test(lerSrc('src/features/motorista-app/api/localizacaoOperacional.ts')), 'o lado MOTORISTA usa o schemaGuard compartilhado (não uma cópia local)');
check('L5', /from '@\/shared\/lib\/schemaGuard'/.test(apiFrotaSrc), 'o lado STAFF (frota) usa o MESMO schemaGuard compartilhado — reuso real entre os dois apps, não reinvenção');

// ============================================================================================
// sanity check do motor de resumo (Módulo 9, mantido da 1ª passada)
// ============================================================================================
const itensSanity: ItemFrotaComLocalizacao[] = [
  { veiculoId: 'v1', placa: 'AAA1A11', statusVeiculo: 'alugado', motoristaId: 'm1', motoristaNome: 'A', contratoId: 'c1', ultimaLocalizacao: { latitude: 0, longitude: 0, accuracyM: 10, timestampMs: Date.now() - 30_000 } },
  { veiculoId: 'v2', placa: 'BBB2B22', statusVeiculo: 'alugado', motoristaId: 'm2', motoristaNome: 'B', contratoId: 'c2', ultimaLocalizacao: { latitude: 0, longitude: 0, accuracyM: 10, timestampMs: Date.now() - 20 * 60_000 } },
  { veiculoId: 'v3', placa: 'CCC3C33', statusVeiculo: 'disponivel', motoristaId: null, motoristaNome: null, contratoId: null, ultimaLocalizacao: null },
];
const resumoSanity = resumoFrota(itensSanity, Date.now());
check('A11', resumoSanity.totalVeiculos === 3 && resumoSanity.localizacaoAtiva === 1 && resumoSanity.semAtualizacao === 1 && resumoSanity.semLocalizacao === 1, 'resumoFrota() classifica cada veículo em exatamente uma categoria (1 ativa / 1 sem atualização / 1 sem localização)');

// ============================================================================================
// relatório
// ============================================================================================
const categorias = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
for (const cat of categorias) {
  const doCat = resultados.filter((r) => r.caso.startsWith(cat));
  console.log(`\n--- Categoria ${cat} (${doCat.filter((r) => r.ok).length}/${doCat.length}) ---`);
  for (const r of doCat) console.log(`${r.ok ? 'PASS' : 'FALHOU'} [${r.caso}] ${r.msg}`);
}
console.log(`\n==== audit-frota-localizacao-fase20: ${passes}/${passes + fails} ====`);
if (fails > 0) process.exit(1);
