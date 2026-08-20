-- PrimeCharge OS — 0048 — APP MOTORISTA: Diário Operacional Real (Fase 12.1)
-- ============================================================================================
-- ⚠️ NÃO APLICADA EM PRODUÇÃO. Validada só no harness local. Produção somente com autorização.
-- ============================================================================================
-- JUSTIFICATIVA (auditoria da Fase 12.0, doc claude/auditoria-fase12.0-*):
-- - KM diário e recarga POR EVENTO não existem em nenhuma tabela (odômetro é pontual:
--   vistorias/contrato; recarga só existe como despesa RECORRENTE). Nada é reutilizável sem
--   virar segunda fonte de verdade ou vazar dado pessoal pro staff.
-- - O ganho do dia JÁ tem casa (motorista_ganhos, 1 linha/dia) — por isso colunas NOVAS nela,
--   nunca uma segunda tabela de ganhos (motorista_receitas é PROIBIDA).
-- - Dados pessoais do motorista: NUNCA escrevem em veiculos.quilometragem, telemetria_eventos,
--   manutencoes, lancamentos, pagamentos, audit_log ou timeline_eventos. Comparações com dados
--   da empresa acontecem só na LEITURA (vistorias), nunca sincronizam.
-- - Mesma filosofia de RLS da 0047: 1 policy do dono por tabela; staff SEM policy; sem trigger
--   de audit_log DE PROPÓSITO (auditar vazaria a operação pessoal pro staff).
-- ============================================================================================

-- =========================== 1. DIÁRIO NO PRÓPRIO motorista_ganhos ==========================
-- Todos os campos OPCIONAIS: o dia continua válido só com ganho+horas (Fase 12.1).
-- km_rodado NÃO é coluna — é DERIVADO (km_fim − km_inicio) no motor, só quando ambos existem.
alter table motorista_ganhos
  add column if not exists km_inicio numeric(8,1) check (km_inicio is null or km_inicio >= 0),
  add column if not exists km_fim    numeric(8,1) check (km_fim is null or km_fim >= 0),
  add column if not exists corridas  integer      check (corridas is null or corridas >= 0),
  add column if not exists apps      text[];

-- final < inicial nunca entra no banco (a aplicação também bloqueia antes)
do $$ begin
  alter table motorista_ganhos
    add constraint chk_motorista_ganhos_km_ordem
    check (km_inicio is null or km_fim is null or km_fim >= km_inicio);
exception when duplicate_object then null;
end $$;

-- =========================== 2. RECARGAS POR EVENTO =========================================
-- Cada recarga é um EVENTO independente (≠ da despesa recorrente em motorista_despesas — a UI
-- mostra a divergência e oferece pausar a recorrência; nunca altera nada sozinha).
create table if not exists motorista_recargas (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references motoristas(id) on delete cascade,
  data date not null,
  custo numeric(10,2) not null check (custo >= 0),
  kwh numeric(6,2) check (kwh is null or kwh >= 0),
  pct_inicial numeric(5,2) check (pct_inicial is null or (pct_inicial >= 0 and pct_inicial <= 100)),
  pct_final numeric(5,2) check (pct_final is null or (pct_final >= 0 and pct_final <= 100)),
  local text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_motorista_recargas_dono on motorista_recargas(motorista_id, data desc);

-- =========================== RLS — EXCLUSIVA DO MOTORISTA DONO ==============================
alter table motorista_recargas enable row level security;
drop policy if exists "motorista_recargas: dono total" on motorista_recargas;
create policy "motorista_recargas: dono total" on motorista_recargas
  for all
  using (motorista_id = public.current_motorista_id())
  with check (motorista_id = public.current_motorista_id());
