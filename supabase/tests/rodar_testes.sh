#!/usr/bin/env bash
# Harness de teste local — Fase 1 Segurança do Portal do Motorista.
# Cria um banco descartável, roda o shim + TODAS as migrations do zero + seed + ataques.
# NUNCA toca produção (banco local pc_test, superuser postgres).
set -euo pipefail

DB="${1:-pc_test}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PSQL="su postgres -c"

echo "== (re)criando banco $DB =="
$PSQL "dropdb --if-exists $DB"
$PSQL "createdb $DB"

echo "== shim do ambiente Supabase =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/00_shim_supabase_local.sql'" >/dev/null

echo "== rodando as migrations do zero =="
for f in $(ls "$ROOT"/supabase/migrations/*.sql | sort); do
  $PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$f'" >/dev/null
done
echo "   OK ($(ls "$ROOT"/supabase/migrations/*.sql | wc -l) migrations)"

echo "== seed de teste =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/10_seed_teste.sql'" >/dev/null

echo "== rodando ataques (Fase 1) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/20_ataques.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== rodando ataques (Fase 2) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/30_fase2_seed_e_ataques.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== rodando ataques (Fase 3) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/40_fase3_ataques.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== rodando filas do staff (Fase 4) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/50_fase4_filas_staff.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== rodando Centro Jurídico (Fase Jurídica) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/60_juridico.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== rodando Centro Jurídico (Fase 2 — workflow/notificações/ataques) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/61_juridico_fase2.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== rodando Centro Jurídico (Fase 3 — ciclo de vida/rescisão/concorrência) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/62_juridico_fase3.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== rodando Centro Jurídico (Fase 4 — E2E/IDOR/hardening) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/63_juridico_fase4.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== rodando Centro Jurídico (Fase 5 — biblioteca/histórico de templates) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/64_juridico_fase5.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== rodando Centro Jurídico (Fase 8 — governança/retroatividade/concorrência/órfãos) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/65_juridico_fase8.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== idempotência da 0047, 0048, 0049, 0050 e 0051 (reaplicar não pode dar erro) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/migrations/0047_motorista_financas_pessoais.sql'" >/dev/null
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/migrations/0048_motorista_diario_operacional.sql'" >/dev/null
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/migrations/0049_motorista_corridas.sql'" >/dev/null
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/migrations/0050_motorista_config_copiloto.sql'" >/dev/null
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/migrations/0051_frota_localizacao_operacional.sql'" >/dev/null
echo "   OK (0047, 0048, 0049, 0050 e 0051 reaplicadas sem erro)"

echo "== rodando Minha Meta (0047 — finanças pessoais do motorista) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/66_motorista_financas.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== rodando Diário Operacional (0048 — km/corridas/apps/recargas) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/67_minha_operacao.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== rodando Copiloto do Motorista (0049/0050 — corrida individual + config) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/68_motorista_copiloto.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"

echo "== rodando Localização Operacional (Fase 20 — 0051) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/69_frota_localizacao.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM|ERROR"
