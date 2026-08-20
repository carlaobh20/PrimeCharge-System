-- PrimeCharge OS — 0047 — APP MOTORISTA: Inteligência Financeira Pessoal ("Minha Meta")
-- ============================================================================================
-- ⚠️ NÃO APLICADA EM PRODUÇÃO. Validada só no harness local. Produção somente com autorização.
-- ============================================================================================
-- JUSTIFICATIVA (Módulo 38 da missão — por que o schema existente NÃO serve):
-- Despesas pessoais do motorista (casa, família, alimentação...) são dados PRIVADOS DO
-- MOTORISTA. Todas as tabelas financeiras existentes (lancamentos, contratos, pedidos) são da
-- EMPRESA, com RLS staff — a direção de privacidade é a OPOSTA da exigida (Módulo 33: staff NÃO
-- deve ver despesa pessoal detalhada). Nenhuma tabela existente pode guardar esse dado sem
-- vazá-lo para o staff. Logo: tabelas novas com RLS EXCLUSIVA do motorista dono.
--
-- Decisões de privacidade:
-- - Policies usam public.current_motorista_id() (0039/0045): staff → NULL → zero acesso;
--   motorista INATIVO → NULL → zero acesso; empresa B → motorista diferente → zero acesso.
-- - Staff NÃO tem NENHUMA policy nestas tabelas (nem select).
-- - SEM trigger de audit_log DE PROPÓSITO: audit_log é legível por admins da empresa —
--   auditar despesas pessoais vazaria o conteúdo pro staff. A proteção aqui é RLS + backups.
-- - O aluguel do carro NÃO é armazenado aqui: é DERIVADO do contrato PrimeCharge na leitura
--   (Módulo 32 — nunca duplicar cadastro).
-- ============================================================================================

-- =========================== 1. DESPESAS PESSOAIS ===========================================
create table if not exists motorista_despesas (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references motoristas(id) on delete cascade,
  grupo text not null check (grupo in ('vida','familia','carro','trabalho')),
  categoria text not null,
  nome text not null,
  dependente text,                            -- só p/ grupo 'familia' (nome/apelido)
  valor numeric(12,2) not null check (valor >= 0),
  periodicidade text not null default 'mensal'
    check (periodicidade in ('diaria','semanal','quinzenal','mensal','anual')),
  vencimento_dia integer check (vencimento_dia between 1 and 31),
  obrigatoria boolean not null default true,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_motorista_despesas_dono on motorista_despesas(motorista_id, ativa);

-- =========================== 2. CONFIGURAÇÃO DA META ========================================
create table if not exists motorista_meta_config (
  motorista_id uuid primary key references motoristas(id) on delete cascade,
  dias_trabalho integer not null default 26 check (dias_trabalho between 1 and 31),
  renda_hora numeric(8,2) not null default 40 check (renda_hora > 0),
  reserva_meta numeric(12,2) check (reserva_meta >= 0),
  reserva_atual numeric(12,2) check (reserva_atual >= 0),
  reserva_contribuicao_mensal numeric(12,2) check (reserva_contribuicao_mensal >= 0),
  atualizado_em timestamptz not null default now()
);

-- =========================== 3. OBJETIVOS ===================================================
create table if not exists motorista_objetivos (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references motoristas(id) on delete cascade,
  nome text not null,
  categoria text not null default 'outro',
  valor_meta numeric(12,2) not null check (valor_meta > 0),
  valor_atual numeric(12,2) not null default 0 check (valor_atual >= 0),
  prazo date,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists idx_motorista_objetivos_dono on motorista_objetivos(motorista_id, ativo);

-- =========================== 4. GANHOS (lançamento MANUAL do realizado) =====================
-- Módulo 16: o sistema NÃO tem faturamento real do motorista (apps de corrida) — nada é
-- inventado; o motorista lança o realizado do dia. Um registro por dia (upsert).
create table if not exists motorista_ganhos (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references motoristas(id) on delete cascade,
  data date not null,
  valor numeric(12,2) not null check (valor >= 0),
  horas numeric(4,1) check (horas >= 0 and horas <= 24),
  observacao text,
  criado_em timestamptz not null default now(),
  unique (motorista_id, data)
);
create index if not exists idx_motorista_ganhos_dono on motorista_ganhos(motorista_id, data desc);

-- =========================== 5. HISTÓRICO MENSAL DE CUSTOS ==================================
-- Módulo 27: snapshot do custo mensal por grupo, gravado pelo próprio app do motorista
-- (upsert do mês corrente ao abrir a tela — sem cron, sem automação silenciosa de servidor).
create table if not exists motorista_custos_snapshots (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references motoristas(id) on delete cascade,
  mes date not null,                          -- sempre dia 1 do mês
  total numeric(12,2) not null check (total >= 0),
  por_grupo jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  unique (motorista_id, mes)
);

-- =========================== atualizado_em ==================================================
do $$
declare t text;
begin
  foreach t in array array['motorista_despesas','motorista_meta_config'] loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s;', t);
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function public.fn_set_atualizado_em();', t);
  end loop;
end $$;

-- =========================== RLS — EXCLUSIVA DO MOTORISTA DONO ==============================
do $$
declare t text;
begin
  foreach t in array array['motorista_despesas','motorista_meta_config','motorista_objetivos','motorista_ganhos','motorista_custos_snapshots'] loop
    execute format('alter table %1$s enable row level security;', t);
    execute format('drop policy if exists "%1$s: dono total" on %1$s;', t);
    execute format(
      'create policy "%1$s: dono total" on %1$s for all using (motorista_id = public.current_motorista_id()) with check (motorista_id = public.current_motorista_id());',
      t);
  end loop;
end $$;
