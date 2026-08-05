-- PrimeCharge OS — Sprint 9: Operations Platform (camada operacional)
-- Referência: DECISION_LOG.md DEC-054 a DEC-062 (decisões de desenho tomadas antes desta
-- migration, sem código, conforme pedido do briefing da sprint).
--
-- Escopo real desta migration (DEC-054): duas capacidades novas, não dez engines.
-- 1. `acoes_operacionais` — Task Engine real (DEC-055/056/057/058/062): status/prioridade/
--    responsável/prazo/origem, com state machine no banco e geração via "geradores" (código
--    TS, não pg_cron — automação real fica pra Fase 8).
-- 2. `checklists`/`checklist_itens` — Checklist Engine real (DEC-059), sem camada de
--    template ainda (regra dos 3 aplicada à parte de reuso, não à parte estrutural).
-- Além disso: `arquivos.data_validade` (DEC-060) — campo novo, sem UI nesta sprint.
-- Approval, Automation, Notification, Document, Maintenance, Inspection, Scheduling e Renewal
-- NÃO ganham tabela própria nesta sprint — ver DEC-054 e as decisões específicas de cada uma.

-- ============================================================
-- 1. Enums
-- ============================================================

do $$ begin
  create type acao_status as enum ('pendente','em_andamento','concluida','cancelada');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type acao_prioridade as enum ('baixa','media','alta','critica');
exception
  when duplicate_object then null;
end $$;

-- 'sistema' (não 'automacao') é o que os 3 geradores desta sprint usam — rodam sob demanda
-- (botão "Atualizar ações"), não por pg_cron. Chamar isso de 'automacao' seria dishonesto
-- pela mesma regra de honestidade de DEC-022/DEC-047. 'automacao'/'agente'/'ia' já existem no
-- enum como preparo (DEC-058), mas nenhum gerador desta sprint os produz ainda.
do $$ begin
  create type acao_origem as enum ('manual','sistema','automacao','agente','ia');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type checklist_status as enum ('aberto','concluido','cancelado');
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- 2. Ações Operacionais — DEC-055
-- `tipo` é text livre, não enum (motivo registrado em DEC-055): cada Engine futura (Inspection,
-- OBD2, Driver Program...) vira um novo gerador com um novo valor de `tipo`, não uma migration
-- nova. `entidade_tipo`/`entidade_id` seguem o mesmo padrão genérico das capabilities da
-- migration 0002 (FOUNDATION_PRINCIPLES.md Princípio 1) — nulo quando a ação não pertence a
-- nenhuma entidade de negócio específica.
-- ============================================================

create table if not exists acoes_operacionais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  titulo text not null,
  descricao text,
  tipo text not null default 'manual',

  status acao_status not null default 'pendente',
  prioridade acao_prioridade not null default 'media',
  origem acao_origem not null default 'manual',

  responsavel_id uuid references usuarios(id) on delete set null,
  prazo date,

  entidade_tipo text,
  entidade_id uuid,

  -- Nome do gerador que criou esta ação (ex. 'motorista.cnh_vencendo') — nulo se manual.
  -- Usado pelo índice único abaixo pra evitar duplicar a mesma ação a cada sincronização.
  gerado_por text,

  concluida_em timestamptz,
  concluida_por uuid references usuarios(id) on delete set null,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint chk_acoes_entidade_par check (
    (entidade_tipo is null and entidade_id is null) or (entidade_tipo is not null and entidade_id is not null)
  )
);

create index if not exists idx_acoes_empresa on acoes_operacionais(empresa_id);
create index if not exists idx_acoes_status on acoes_operacionais(empresa_id, status);
create index if not exists idx_acoes_responsavel on acoes_operacionais(responsavel_id);
create index if not exists idx_acoes_prazo on acoes_operacionais(empresa_id, prazo);
create index if not exists idx_acoes_entidade on acoes_operacionais(entidade_tipo, entidade_id);

-- Uma ação gerada aberta por (gerador, entidade) por vez — sincronizar duas vezes não duplica.
-- Ações manuais (gerado_por nulo) não entram nesta restrição.
create unique index if not exists uq_acoes_geradas_abertas
  on acoes_operacionais(empresa_id, gerado_por, entidade_tipo, entidade_id)
  where gerado_por is not null and status in ('pendente','em_andamento');

-- ============================================================
-- 3. Checklists — DEC-059 (sem template ainda, ver decisão)
-- ============================================================

create table if not exists checklists (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  titulo text not null,
  status checklist_status not null default 'aberto',

  entidade_tipo text not null,
  entidade_id uuid not null,

  responsavel_id uuid references usuarios(id) on delete set null,
  concluido_em timestamptz,
  concluido_por uuid references usuarios(id) on delete set null,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_checklists_empresa on checklists(empresa_id);
create index if not exists idx_checklists_entidade on checklists(entidade_tipo, entidade_id);
create index if not exists idx_checklists_status on checklists(empresa_id, status);

create table if not exists checklist_itens (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references checklists(id) on delete cascade,

  ordem int not null default 0,
  descricao text not null,
  obrigatorio boolean not null default true,

  resposta boolean,
  observacao text,
  respondido_por uuid references usuarios(id) on delete set null,
  respondido_em timestamptz,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_checklist_itens_checklist on checklist_itens(checklist_id);

-- ============================================================
-- 4. `arquivos.data_validade` — DEC-060 (campo novo, sem UI nesta sprint)
-- ============================================================

alter table arquivos add column if not exists data_validade date;

-- ============================================================
-- 5. RLS
-- ============================================================

alter table acoes_operacionais enable row level security;
alter table checklists enable row level security;
alter table checklist_itens enable row level security;

drop policy if exists "acoes_operacionais: select por empresa" on acoes_operacionais;
create policy "acoes_operacionais: select por empresa" on acoes_operacionais
  for select using (empresa_id = public.current_empresa_id());
drop policy if exists "acoes_operacionais: insert por empresa" on acoes_operacionais;
create policy "acoes_operacionais: insert por empresa" on acoes_operacionais
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('operacoes','criar'));
-- Igual à correção feita em pagamentos (Sprint 8, migration 0006): update sempre exige a
-- permissão genérica 'editar' como piso, mesmo pra transições de status — a ação específica
-- (concluir/cancelar) ainda passa por gate próprio dentro do trigger de state machine abaixo.
drop policy if exists "acoes_operacionais: update por empresa" on acoes_operacionais;
create policy "acoes_operacionais: update por empresa" on acoes_operacionais
  for update using (empresa_id = public.current_empresa_id() and public.pode('operacoes','editar'));

drop policy if exists "checklists: select por empresa" on checklists;
create policy "checklists: select por empresa" on checklists
  for select using (empresa_id = public.current_empresa_id());
drop policy if exists "checklists: insert por empresa" on checklists;
create policy "checklists: insert por empresa" on checklists
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('operacoes','criar'));
drop policy if exists "checklists: update por empresa" on checklists;
create policy "checklists: update por empresa" on checklists
  for update using (empresa_id = public.current_empresa_id() and public.pode('operacoes','editar'));

-- checklist_itens não tem empresa_id próprio — isolamento por empresa vem do checklist pai
-- (mesmo padrão de tabelas "item de" já usadas no schema, ex. nenhuma linha solta sem dono).
drop policy if exists "checklist_itens: select via checklist" on checklist_itens;
create policy "checklist_itens: select via checklist" on checklist_itens
  for select using (exists (
    select 1 from checklists c where c.id = checklist_itens.checklist_id and c.empresa_id = public.current_empresa_id()
  ));
drop policy if exists "checklist_itens: insert via checklist" on checklist_itens;
create policy "checklist_itens: insert via checklist" on checklist_itens
  for insert with check (
    public.pode('operacoes','criar') and exists (
      select 1 from checklists c where c.id = checklist_itens.checklist_id and c.empresa_id = public.current_empresa_id()
    )
  );
drop policy if exists "checklist_itens: update via checklist" on checklist_itens;
create policy "checklist_itens: update via checklist" on checklist_itens
  for update using (
    public.pode('operacoes','editar') and exists (
      select 1 from checklists c where c.id = checklist_itens.checklist_id and c.empresa_id = public.current_empresa_id()
    )
  );

-- ============================================================
-- 6. Matriz de permissão do módulo "operacoes" (mesmo mecanismo pode(), DEC-026/DEC-035)
-- Ações e Checklists compartilham o mesmo módulo — são a mesma camada conceitual (rastrear
-- trabalho operacional), não dois domínios distintos. 'aprovar' propositalmente NÃO existe
-- ainda na matriz (DEC-057) — nasce só quando um caso real de aprovação existir.
-- ============================================================

insert into permissoes (role, modulo, acao, permitido)
select role, 'operacoes', acao, true
from (values ('super_admin'), ('owner'), ('admin')) as r(role)
cross join (values ('ver'),('criar'),('editar'),('concluir'),('cancelar')) as a(acao)
on conflict (role, modulo, acao) do nothing;

-- Diferente do Financeiro (DEC-052/migration 0006), onde 'editar'/'cancelar' ficam restritos
-- a papéis de administração porque o dado é dinheiro — Ação Operacional é fila de trabalho
-- do dia a dia, não movimentação financeira, e restringir demais contradiria o propósito do
-- módulo ("quem precisa agir" inclui operador). 'cancelar' fica um degrau acima de
-- 'editar'/'concluir' (exige gestor_frota/gestor_financeiro ou administração) porque
-- descartar uma ação sem concluí-la é uma decisão de "isto não precisa mais acontecer", não
-- trabalho de execução — mas 'editar' e 'concluir' são trabalho operacional normal.
insert into permissoes (role, modulo, acao, permitido) values
  ('gestor_frota','operacoes','ver',true),
  ('gestor_frota','operacoes','criar',true),
  ('gestor_frota','operacoes','editar',true),
  ('gestor_frota','operacoes','concluir',true),
  ('gestor_frota','operacoes','cancelar',true),
  ('gestor_financeiro','operacoes','ver',true),
  ('gestor_financeiro','operacoes','criar',true),
  ('gestor_financeiro','operacoes','editar',true),
  ('gestor_financeiro','operacoes','concluir',true),
  ('gestor_financeiro','operacoes','cancelar',true),
  ('operador','operacoes','ver',true),
  ('operador','operacoes','criar',true),
  ('operador','operacoes','editar',true),
  ('operador','operacoes','concluir',true)
on conflict (role, modulo, acao) do nothing;

-- ============================================================
-- 7. State Machine de Ação Operacional (mesmo padrão de Contrato/Lançamento/Pagamento)
-- ============================================================

create or replace function public.fn_validar_transicao_acao() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valida boolean;
  v_acao text;
begin
  if TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_valida := case old.status
      when 'pendente' then new.status in ('em_andamento','concluida','cancelada')
      when 'em_andamento' then new.status in ('concluida','cancelada')
      else false
    end;

    if not v_valida then
      raise exception 'Transição de status de ação inválida: % → %', old.status, new.status;
    end if;

    v_acao := case new.status
      when 'concluida' then 'concluir'
      when 'cancelada' then 'cancelar'
      else null
    end;

    if v_acao is not null and not public.pode('operacoes', v_acao) then
      raise exception 'Usuário sem permissão para a ação "%"', v_acao;
    end if;

    if new.status = 'concluida' and new.concluida_em is null then
      new.concluida_em := now();
      if new.concluida_por is null then
        new.concluida_por := auth.uid();
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_acoes_valida_transicao on acoes_operacionais;
create trigger trg_acoes_valida_transicao before update on acoes_operacionais
  for each row execute function public.fn_validar_transicao_acao();

-- ============================================================
-- 8. State Machine de Checklist
-- ============================================================

create or replace function public.fn_validar_transicao_checklist() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valida boolean;
  v_acao text;
begin
  if TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_valida := old.status = 'aberto' and new.status in ('concluido','cancelado');

    if not v_valida then
      raise exception 'Transição de status de checklist inválida: % → %', old.status, new.status;
    end if;

    v_acao := case new.status
      when 'concluido' then 'concluir'
      when 'cancelado' then 'cancelar'
      else null
    end;

    if v_acao is not null and not public.pode('operacoes', v_acao) then
      raise exception 'Usuário sem permissão para a ação "%"', v_acao;
    end if;

    if new.status = 'concluido' and new.concluido_em is null then
      new.concluido_em := now();
      if new.concluido_por is null then
        new.concluido_por := auth.uid();
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_checklists_valida_transicao on checklists;
create trigger trg_checklists_valida_transicao before update on checklists
  for each row execute function public.fn_validar_transicao_checklist();

-- ============================================================
-- 9. Triggers: atualizado_em, auditoria, timeline
-- ============================================================

drop trigger if exists trg_acoes_atualizado_em on acoes_operacionais;
create trigger trg_acoes_atualizado_em before update on acoes_operacionais
  for each row execute function public.fn_set_atualizado_em();
drop trigger if exists trg_acoes_audit on acoes_operacionais;
create trigger trg_acoes_audit after insert or update or delete on acoes_operacionais
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_checklists_atualizado_em on checklists;
create trigger trg_checklists_atualizado_em before update on checklists
  for each row execute function public.fn_set_atualizado_em();
drop trigger if exists trg_checklists_audit on checklists;
create trigger trg_checklists_audit after insert or update or delete on checklists
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_checklist_itens_atualizado_em on checklist_itens;
create trigger trg_checklist_itens_atualizado_em before update on checklist_itens
  for each row execute function public.fn_set_atualizado_em();
drop trigger if exists trg_checklist_itens_audit on checklist_itens;
create trigger trg_checklist_itens_audit after insert or update or delete on checklist_itens
  for each row execute function public.fn_audit_log();

create or replace function public.fn_timeline_acao() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
begin
  if TG_OP = 'INSERT' then
    v_descricao := 'Ação criada: ' || new.titulo || ' (' || new.tipo || ')';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'acao_operacional', new.id, 'criacao', v_descricao, auth.uid());
  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_descricao := 'Status alterado de "' || old.status || '" para "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'acao_operacional', new.id, 'status_alterado', v_descricao, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_acoes_timeline on acoes_operacionais;
create trigger trg_acoes_timeline after insert or update on acoes_operacionais
  for each row execute function public.fn_timeline_acao();

create or replace function public.fn_timeline_checklist() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
begin
  if TG_OP = 'INSERT' then
    v_descricao := 'Checklist criado: ' || new.titulo;
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'checklist', new.id, 'criacao', v_descricao, auth.uid());
  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_descricao := 'Status alterado de "' || old.status || '" para "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'checklist', new.id, 'status_alterado', v_descricao, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_checklists_timeline on checklists;
create trigger trg_checklists_timeline after insert or update on checklists
  for each row execute function public.fn_timeline_checklist();
