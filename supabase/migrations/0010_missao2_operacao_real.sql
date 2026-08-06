-- PrimeCharge OS — Missão 2 (Operação Real), 2026-08-06
-- Referência: DECISION_LOG.md DEC-075 a DEC-08x.
--
-- Escopo desta migration:
-- 1. `manutencoes` — tabela nova, fecha o buraco real encontrado na auditoria (Fase 3):
--    hoje não existe nenhum registro estruturado de manutenção de veículo.
-- 2. `checklists` ganha colunas nullable de preparo para Vistoria Inteligente (Fase 5) —
--    GPS, assinatura, score, versão, comparação. Nenhuma UI nova as preenche ainda; existem
--    para o Driver App (Fase 4) e a Vistoria Inteligente (Fase 5) escreverem quando existirem.
-- 3. `telemetria_eventos` — tabela nova, vazia por design (Fase 6). Modelo genérico
--    (tipo + valor + unidade), não uma coluna por métrica — evita apostar no formato errado
--    antes de qualquer integração real de OBD2/BMS existir. Sem UI, sem ingestão automática.
-- 4. Fecha um vazamento pequeno de PII interno em `convites` (SELECT era visível pra
--    qualquer usuário da empresa; agora só admin).
--
-- Fora de escopo desta migration (decisão, não esquecimento — ver DEC-076 a DEC-078):
-- - `pode()` em INSERT de arquivos/comentarios/tags/favoritos — mantido como está.
-- - Policy de DELETE em pagamentos/contas_bancarias/centros_custo/acoes_operacionais/
--   checklists/checklist_itens — mantido como está (nunca deletável).
-- - Novo módulo de permissão para manutenções — reaproveita `pode('veiculos', ...)`.

-- ============================================================
-- 1. Manutenções — Fase 3 (Ciclo completo do ativo)
-- ============================================================

do $$ begin
  create type manutencao_tipo as enum ('preventiva','corretiva','outro');
exception
  when duplicate_object then null;
end $$;

create table if not exists manutencoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  veiculo_id uuid not null references veiculos(id) on delete cascade,

  tipo manutencao_tipo not null default 'preventiva',
  descricao text not null,
  oficina text,
  km integer,
  custo numeric(12,2),
  data_execucao date not null default current_date,

  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint chk_manutencoes_km check (km is null or km >= 0),
  constraint chk_manutencoes_custo check (custo is null or custo >= 0)
);

create index if not exists idx_manutencoes_empresa on manutencoes(empresa_id);
create index if not exists idx_manutencoes_veiculo on manutencoes(veiculo_id, data_execucao desc);

drop trigger if exists trg_manutencoes_atualizado_em on manutencoes;
create trigger trg_manutencoes_atualizado_em before update on manutencoes
  for each row execute function public.fn_set_atualizado_em();

alter table manutencoes enable row level security;

drop policy if exists "manutencoes: select por empresa" on manutencoes;
create policy "manutencoes: select por empresa" on manutencoes
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "manutencoes: insert por permissao" on manutencoes;
create policy "manutencoes: insert por permissao" on manutencoes
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('veiculos','criar'));

drop policy if exists "manutencoes: update por permissao" on manutencoes;
create policy "manutencoes: update por permissao" on manutencoes
  for update using (empresa_id = public.current_empresa_id() and public.pode('veiculos','editar'));

drop policy if exists "manutencoes: delete por permissao" on manutencoes;
create policy "manutencoes: delete por permissao" on manutencoes
  for delete using (empresa_id = public.current_empresa_id() and public.pode('veiculos','excluir'));

-- Timeline do veículo recebe um evento a cada manutenção registrada — mesmo padrão de
-- fn_timeline_veiculo (0003), reaproveitando a tabela genérica timeline_eventos (0002).
create or replace function public.fn_timeline_manutencao() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
begin
  if TG_OP = 'INSERT' then
    v_descricao := 'Manutenção registrada (' || new.tipo || '): ' || new.descricao;
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'veiculo', new.veiculo_id, 'manutencao_registrada', v_descricao, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_manutencoes_timeline on manutencoes;
create trigger trg_manutencoes_timeline after insert on manutencoes
  for each row execute function public.fn_timeline_manutencao();

-- ============================================================
-- 2. Checklists — preparo para Driver App (Fase 4) e Vistoria Inteligente (Fase 5)
-- Colunas nullable, sem trigger, sem UI nova — só o lugar certo para o Driver App e a futura
-- Vistoria Inteligente escreverem, sem precisar de migration quando chegarem.
-- ============================================================

alter table checklists add column if not exists gps_lat numeric(9,6);
alter table checklists add column if not exists gps_lng numeric(9,6);
alter table checklists add column if not exists assinatura_url text;
alter table checklists add column if not exists score numeric(5,2);
alter table checklists add column if not exists versao integer not null default 1;
alter table checklists add column if not exists checklist_anterior_id uuid references checklists(id) on delete set null;

comment on column checklists.gps_lat is 'Preparo Fase 4/5 — populado pelo Driver App quando existir. Sem UI web nesta missão.';
comment on column checklists.gps_lng is 'Preparo Fase 4/5 — populado pelo Driver App quando existir. Sem UI web nesta missão.';
comment on column checklists.assinatura_url is 'Preparo Fase 4/5 — URL de assinatura no storage. Sem UI web nesta missão.';
comment on column checklists.score is 'Preparo Fase 5 (Vistoria Inteligente) — preenchido por IA futura, nunca calculado hoje.';
comment on column checklists.checklist_anterior_id is 'Preparo Fase 5 — permite comparação com a vistoria anterior da mesma entidade quando a IA existir.';

-- ============================================================
-- 3. Telemetria — Fase 6, tabela vazia por design
-- Modelo genérico (tipo/valor/unidade), não uma coluna por métrica (SOC/SOH/temperatura...) —
-- o formato exato de cada leitura real só se confirma quando uma integração real de
-- OBD2/BMS existir; até lá, apostar em colunas fixas arriscaria escolher o formato errado.
-- Sem UI, sem gerador, sem cron — só o modelo e a proteção de RLS, como pedido ("somente
-- preparar, nunca implementar leitura").
-- ============================================================

create table if not exists telemetria_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  veiculo_id uuid not null references veiculos(id) on delete cascade,

  tipo text not null, -- 'soc' | 'soh' | 'temperatura' | 'tensao' | 'corrente' | 'odometro' | 'consumo' | 'ciclos' | 'carga_ac' | 'carga_dc' | 'evento'
  valor numeric,
  unidade text,
  origem text not null default 'manual', -- 'obd2' | 'manual' | 'simulado' | 'agente' — nenhum produtor real ainda

  metadata jsonb not null default '{}'::jsonb,
  capturado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

create index if not exists idx_telemetria_veiculo on telemetria_eventos(veiculo_id, tipo, capturado_em desc);
create index if not exists idx_telemetria_empresa on telemetria_eventos(empresa_id);

alter table telemetria_eventos enable row level security;

drop policy if exists "telemetria: select por empresa" on telemetria_eventos;
create policy "telemetria: select por empresa" on telemetria_eventos
  for select using (empresa_id = public.current_empresa_id());

-- INSERT restrito a quem edita veículo — não existe produtor automático ainda; quando a
-- integração real chegar, ela troca este gate por uma policy própria de service role.
drop policy if exists "telemetria: insert por permissao" on telemetria_eventos;
create policy "telemetria: insert por permissao" on telemetria_eventos
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('veiculos','editar'));

-- ============================================================
-- 4. `convites` — SELECT deixa de ser visível para qualquer colega da empresa
-- Achado da auditoria: e-mail + role pretendido de um convite pendente vazava para qualquer
-- usuário ativo da empresa, não só admins — mesmo nível de dado que já é protegido em
-- usuarios/audit_log. INSERT/DELETE já eram admin-only desde a 0009; SELECT ficou pra trás.
-- ============================================================

drop policy if exists "convites: visivel para a empresa" on convites;
drop policy if exists "convites: select por admin da empresa" on convites;
create policy "convites: select por admin da empresa" on convites
  for select using (empresa_id = public.current_empresa_id() and public.eh_admin_da_empresa());
