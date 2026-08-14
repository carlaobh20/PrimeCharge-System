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
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/20_ataques.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM"

echo "== rodando ataques (Fase 2) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/30_fase2_seed_e_ataques.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM"

echo "== rodando ataques (Fase 3) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/40_fase3_ataques.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM"

echo "== rodando filas do staff (Fase 4) =="
$PSQL "psql -v ON_ERROR_STOP=1 -q -d $DB -f '$ROOT/supabase/tests/50_fase4_filas_staff.sql'" 2>&1 | grep -E "PASS:|FALHOU:|PASSARAM"
