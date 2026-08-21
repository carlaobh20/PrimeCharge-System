-- PrimeCharge OS — 0049 — APP MOTORISTA: Corrida Individual (Fase 16 / Copiloto — Fase C)
-- ============================================================================================
-- ⚠️ NÃO APLICADA EM PRODUÇÃO. Validada só no harness local (Postgres real). Produção somente
-- com autorização explícita.
-- ============================================================================================
-- JUSTIFICATIVA (auditoria de reuso, claude/auditoria-reuso-fase16-copiloto-2026-08-21.md):
-- - Corrida individual é uma granularidade que NÃO existe em nenhuma tabela hoje. motorista_ganhos
--   guarda um AGREGADO por dia (1 linha/dia, coluna `corridas` = contagem inteira). Não é possível
--   guardar corrida-a-corrida numa tabela pensada pra 1 linha/dia sem quebrar a unique(motorista_id,
--   data) já existente — por isso tabela nova, não coluna nova.
-- - motorista_ganhos.corridas (contagem diária, 0048) CONTINUA existindo e continua servindo quem
--   não usa o Copiloto. Esta tabela é uma FONTE ADICIONAL, nunca uma substituição: a soma das
--   corridas registradas aqui alimenta o dia por DERIVAÇÃO na leitura (Fase D), nunca sobrescreve
--   motorista_ganhos. Divergência entre a contagem manual e a soma das corridas vira "DADOS
--   DIFERENTES" pra decisão humana — nunca reconciliação automática e silenciosa.
-- - `origem_captura` é TEXTO LIVRE (default 'manual'), não enum rígido: hoje só existe captura
--   manual; se um dia existir captura por overlay (Fase M, ainda não implementada) ou qualquer
--   outra origem futura, o valor entra sem precisar de nova migration pra ampliar um enum.
-- - `app` também é texto livre pela mesma razão que motorista_ganhos.apps é text[] (0048): não é
--   papel do PrimeCharge travar em uma lista fixa de aplicativos.
-- - `classificacao` é o resultado do semáforo NO MOMENTO da avaliação (snapshot). Ela não é
--   recalculada depois — se os critérios do motorista mudarem (0050), corridas antigas mantêm o
--   veredito que existia quando foram avaliadas. Isso é histórico, não um valor vivo.
-- - Dado de corrida NUNCA escreve em: veiculos, checklists, contratos, telemetria_eventos,
--   manutencoes, lancamentos, pagamentos, audit_log, timeline_eventos. É dado pessoal do
--   motorista, do mesmo jeito que despesas/ganhos/recargas já são (0047/0048).
-- - Mesma filosofia de RLS da 0047/0048: 1 policy do dono por tabela; staff SEM policy; SEM
--   trigger de audit_log DE PROPÓSITO (auditar vazaria a operação pessoal pro staff).
-- ============================================================================================

create table if not exists motorista_corridas (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references motoristas(id) on delete cascade,

  -- quando: dia (pra agrupar/join com motorista_ganhos) + hora opcional (pra Fase I, padrões por
  -- horário — NUNCA inventada: se o motorista não informar, fica null, não vira "00:00").
  data date not null default current_date,
  hora time,

  -- o quê: app de origem (texto livre — ver justificativa acima) e os dados que alimentam
  -- avaliarCorrida() (Fase A) — todos os numéricos NOT NULL só quando são o mínimo pra avaliar
  -- (valor); o resto é opcional porque nem todo app mostra tudo antes de aceitar.
  app text,
  valor numeric(10,2) not null check (valor >= 0),
  km_estimado numeric(6,1) check (km_estimado is null or km_estimado >= 0),
  duracao_estimada_min integer check (duracao_estimada_min is null or duracao_estimada_min >= 0),

  -- resultado do semáforo no momento da avaliação (snapshot — ver justificativa acima) e a
  -- decisão real do motorista (aceitar ou não é sempre dele; null = não informado, nunca false).
  classificacao text check (classificacao is null or classificacao in ('BOM', 'ATENCAO', 'RUIM')),
  aceita boolean,

  origem_captura text not null default 'manual',
  observacao text,

  criado_em timestamptz not null default now()
);

create index if not exists idx_motorista_corridas_dono
  on motorista_corridas(motorista_id, data desc, criado_em desc);

-- =========================== RLS — EXCLUSIVA DO MOTORISTA DONO ==============================
alter table motorista_corridas enable row level security;
drop policy if exists "motorista_corridas: dono total" on motorista_corridas;
create policy "motorista_corridas: dono total" on motorista_corridas
  for all
  using (motorista_id = public.current_motorista_id())
  with check (motorista_id = public.current_motorista_id());
