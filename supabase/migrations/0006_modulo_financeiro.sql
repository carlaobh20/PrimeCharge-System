-- PrimeCharge OS — Sprint 8: Módulo Financeiro (Finance Platform)
-- Referência: ARQUITETURA.md Fase 3, CORE_CONCEPTS.md seções 2/3/6, VALUE_ENGINE.md (estágios
-- Receita/Custos/Lucro), DECISION_LOG.md DEC-046 a DEC-052 (decisões de desenho tomadas antes
-- desta migration, sem código, conforme pedido do briefing da sprint).
--
-- Escopo real desta migration (DEC-046/DEC-052): contas_bancarias, centros_custo, lancamentos
-- (unifica Receita/Despesa — Provisão é lancamento com status 'prevista', não entidade nova) e
-- pagamentos (evento real de movimentação bancária). Nenhuma tabela de "Indicador"/"ROI" — isso
-- é leitura derivada (Financial Intelligence), não schema novo.
--
-- Esta migration também fecha DEC-040/DEC-041 (DEC-050): motorista sai de "ativo" quando o
-- último contrato termina; motivo_encerramento/motivo_baixa implementados para Motorista/Veículo.

-- ============================================================
-- 1. Enums
-- ============================================================

do $$ begin
  create type lancamento_tipo as enum ('receita','despesa');
exception
  when duplicate_object then null;
end $$;

-- 'prevista' é o que a Sprint 8 chama de Provisão (DEC-046) — não é um estado transitório
-- qualquer, é o estado que representa "ainda não aconteceu, mas é esperado".
do $$ begin
  create type lancamento_status as enum ('prevista','confirmada','cancelada');
exception
  when duplicate_object then null;
end $$;

-- Sem 'atrasado' — atraso é sempre calculado (pendente + data_prevista < hoje), nunca um
-- estado persistido sem mecanismo real que o dispare (não existe pg_cron nesta sprint,
-- Automações continuam Fase 8 — CORE_CONCEPTS.md, seção 1). Mesma disciplina que já rejeitou
-- RecommendationCard em DEC-023: nenhum estado sem consumidor real.
do $$ begin
  create type pagamento_status as enum ('pendente','pago','cancelado','estornado');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type forma_pagamento as enum ('pix','boleto','cartao','transferencia','dinheiro','outro');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type conta_bancaria_tipo as enum ('corrente','poupanca','investimento');
exception
  when duplicate_object then null;
end $$;

-- DEC-049: campo barato de exigir agora, caro de reconstruir depois — hoje sempre 'manual',
-- porque nenhuma automação/Agente real existe ainda para gerar lançamento sozinho.
do $$ begin
  create type lancamento_origem as enum ('manual','automacao','agente','ia');
exception
  when duplicate_object then null;
end $$;

-- DEC-041/DEC-050
do $$ begin
  create type motorista_motivo_encerramento as enum (
    'lead_nao_avancou','reprovado_analise','encerrado_motorista','encerrado_empresa','bloqueio_definitivo'
  );
exception
  when duplicate_object then null;
end $$;

-- DEC-044/DEC-050
do $$ begin
  create type veiculo_motivo_baixa as enum (
    'venda_comercial','sinistro_perda_total','roubo_furto','outro'
  );
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- 2. Contas Bancárias e Centros de Custo — dimensões de referência
-- ============================================================

create table if not exists contas_bancarias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  banco text,
  agencia text,
  conta text,
  tipo conta_bancaria_tipo not null default 'corrente',
  saldo_inicial numeric(12,2) not null default 0,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists centros_custo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint uq_centros_custo_nome unique (empresa_id, nome)
);

create index if not exists idx_contas_bancarias_empresa on contas_bancarias(empresa_id);
create index if not exists idx_centros_custo_empresa on centros_custo(empresa_id);

-- ============================================================
-- 3. Lançamentos (Receita/Despesa unificados — DEC-046)
-- Dimensões opcionais (contrato/veiculo/motorista) são o que torna ROI por veículo, por
-- contrato e por motorista respondível depois (Financial Intelligence, sem tabela nova) —
-- estruturado agora, calculado quando houver volume real (DEC-052).
-- ============================================================

create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  tipo lancamento_tipo not null,
  status lancamento_status not null default 'prevista',

  descricao text not null,
  valor numeric(12,2) not null,
  categoria text,

  centro_custo_id uuid references centros_custo(id) on delete set null,
  contrato_id uuid references contratos(id) on delete set null,
  veiculo_id uuid references veiculos(id) on delete set null,
  motorista_id uuid references motoristas(id) on delete set null,

  data_prevista date not null,
  data_confirmacao date,

  criado_via lancamento_origem not null default 'manual',
  observacoes text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint chk_lancamentos_valor_positivo check (valor > 0)
);

create index if not exists idx_lancamentos_empresa on lancamentos(empresa_id);
create index if not exists idx_lancamentos_status on lancamentos(empresa_id, status);
create index if not exists idx_lancamentos_tipo on lancamentos(empresa_id, tipo);
create index if not exists idx_lancamentos_contrato on lancamentos(contrato_id);
create index if not exists idx_lancamentos_veiculo on lancamentos(veiculo_id);
create index if not exists idx_lancamentos_motorista on lancamentos(motorista_id);
create index if not exists idx_lancamentos_data_prevista on lancamentos(empresa_id, data_prevista);

-- ============================================================
-- 4. Pagamentos — evento real de movimentação bancária, separado do lançamento contábil
-- (DEC-046). Um lançamento tem 0 ou 1 pagamento nesta sprint (parcelamento fica para quando
-- um terceiro caso real justificar — regra dos 3, DEC-010).
-- ============================================================

create table if not exists pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  lancamento_id uuid not null references lancamentos(id) on delete restrict,
  conta_bancaria_id uuid not null references contas_bancarias(id) on delete restrict,

  status pagamento_status not null default 'pendente',
  valor numeric(12,2) not null,
  forma_pagamento forma_pagamento,

  data_prevista date not null,
  data_pagamento date,

  observacoes text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint chk_pagamentos_valor_positivo check (valor > 0)
);

create index if not exists idx_pagamentos_empresa on pagamentos(empresa_id);
create index if not exists idx_pagamentos_status on pagamentos(empresa_id, status);
create index if not exists idx_pagamentos_lancamento on pagamentos(lancamento_id);
create index if not exists idx_pagamentos_conta on pagamentos(conta_bancaria_id);
-- Consulta de "atraso" (pendente + data_prevista < hoje) é o caminho mais comum de leitura
-- desta tabela pela Financial Intelligence — índice dedicado.
create index if not exists idx_pagamentos_pendentes_data on pagamentos(empresa_id, data_prevista) where status = 'pendente';

-- ============================================================
-- 5. RLS
-- ============================================================

alter table contas_bancarias enable row level security;
alter table centros_custo enable row level security;
alter table lancamentos enable row level security;
alter table pagamentos enable row level security;

drop policy if exists "contas_bancarias: select por empresa" on contas_bancarias;
create policy "contas_bancarias: select por empresa" on contas_bancarias
  for select using (empresa_id = public.current_empresa_id());
drop policy if exists "contas_bancarias: insert por empresa" on contas_bancarias;
create policy "contas_bancarias: insert por empresa" on contas_bancarias
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('financeiro','gerenciar_contas'));
drop policy if exists "contas_bancarias: update por empresa" on contas_bancarias;
create policy "contas_bancarias: update por empresa" on contas_bancarias
  for update using (empresa_id = public.current_empresa_id() and public.pode('financeiro','gerenciar_contas'));

drop policy if exists "centros_custo: select por empresa" on centros_custo;
create policy "centros_custo: select por empresa" on centros_custo
  for select using (empresa_id = public.current_empresa_id());
drop policy if exists "centros_custo: insert por empresa" on centros_custo;
create policy "centros_custo: insert por empresa" on centros_custo
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('financeiro','gerenciar_centros_custo'));
drop policy if exists "centros_custo: update por empresa" on centros_custo;
create policy "centros_custo: update por empresa" on centros_custo
  for update using (empresa_id = public.current_empresa_id() and public.pode('financeiro','gerenciar_centros_custo'));

drop policy if exists "lancamentos: select por empresa" on lancamentos;
create policy "lancamentos: select por empresa" on lancamentos
  for select using (empresa_id = public.current_empresa_id());
drop policy if exists "lancamentos: insert por empresa" on lancamentos;
create policy "lancamentos: insert por empresa" on lancamentos
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('financeiro','criar'));
drop policy if exists "lancamentos: update por empresa" on lancamentos;
create policy "lancamentos: update por empresa" on lancamentos
  for update using (empresa_id = public.current_empresa_id() and public.pode('financeiro','editar'));

create or replace function public.pode_excluir_lancamento(p_lancamento_id uuid) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from lancamentos l
    join usuarios u on u.id = auth.uid()
    where l.id = p_lancamento_id
      and l.empresa_id = u.empresa_id
      and u.role in ('super_admin','owner','admin')
  );
$$;

drop policy if exists "lancamentos: delete restrito por role" on lancamentos;
create policy "lancamentos: delete restrito por role" on lancamentos
  for delete using (public.pode_excluir_lancamento(id));

drop policy if exists "pagamentos: select por empresa" on pagamentos;
create policy "pagamentos: select por empresa" on pagamentos
  for select using (empresa_id = public.current_empresa_id());
drop policy if exists "pagamentos: insert por empresa" on pagamentos;
create policy "pagamentos: insert por empresa" on pagamentos
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('financeiro','registrar_pagamento'));
-- Mesma disciplina de "lancamentos: update por empresa" — permissão genérica 'editar' é o
-- piso pra qualquer update (inclusive campos que não são status, ex. observacoes/forma_
-- pagamento), e a troca de status em si ainda passa por gate específico dentro do trigger
-- fn_validar_transicao_pagamento (registrar_pagamento/cancelar_pagamento/estornar_pagamento).
-- Sem o 'pode()' aqui, qualquer usuário da empresa (inclusive "operador", que não tem
-- 'editar' na matriz da seção 6) poderia alterar valor/data/conta de um pagamento sem
-- disparar troca de status — bug real encontrado na revisão crítica desta sprint, corrigido
-- antes de aplicar a migration.
drop policy if exists "pagamentos: update por empresa" on pagamentos;
create policy "pagamentos: update por empresa" on pagamentos
  for update using (empresa_id = public.current_empresa_id() and public.pode('financeiro','editar'));

-- ============================================================
-- 6. Matriz de permissão do módulo "financeiro" (mesmo mecanismo pode(), DEC-026/DEC-035)
-- gestor_financeiro conduz a operação real, mas cancelamento/estorno/exclusão continuam
-- restritos a quem administra a empresa — mesma disciplina de AGENT_PLATFORM seção 7
-- ("ação financeira nunca autônoma sem aprovação explícita"), aplicada aqui a humanos:
-- reverter dinheiro já não é uma ação de rotina, mesmo para quem opera o módulo no dia a dia.
-- ============================================================

insert into permissoes (role, modulo, acao, permitido)
select role, 'financeiro', acao, true
from (values ('super_admin'), ('owner'), ('admin')) as r(role)
cross join (values
  ('ver'),('criar'),('editar'),('confirmar'),('cancelar'),('excluir'),
  ('registrar_pagamento'),('cancelar_pagamento'),('estornar_pagamento'),
  ('gerenciar_contas'),('gerenciar_centros_custo')
) as a(acao)
on conflict (role, modulo, acao) do nothing;

insert into permissoes (role, modulo, acao, permitido) values
  ('gestor_financeiro','financeiro','ver',true),
  ('gestor_financeiro','financeiro','criar',true),
  ('gestor_financeiro','financeiro','editar',true),
  ('gestor_financeiro','financeiro','confirmar',true),
  ('gestor_financeiro','financeiro','registrar_pagamento',true),
  ('gestor_financeiro','financeiro','gerenciar_contas',true),
  ('gestor_financeiro','financeiro','gerenciar_centros_custo',true),
  ('gestor_frota','financeiro','ver',true),
  ('operador','financeiro','ver',true),
  ('operador','financeiro','criar',true)
on conflict (role, modulo, acao) do nothing;

-- ============================================================
-- 7. State Machine de Lançamento — validada no banco (mesmo padrão de Contrato, DEC-034)
-- ============================================================

create or replace function public.fn_validar_transicao_lancamento() returns trigger
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
      when 'prevista' then new.status in ('confirmada','cancelada')
      when 'confirmada' then new.status in ('cancelada')
      else false
    end;

    if not v_valida then
      raise exception 'Transição de status de lançamento inválida: % → %', old.status, new.status;
    end if;

    v_acao := case new.status
      when 'confirmada' then 'confirmar'
      when 'cancelada' then 'cancelar'
      else null
    end;

    if v_acao is not null and not public.pode('financeiro', v_acao) then
      raise exception 'Usuário sem permissão para a ação "%"', v_acao;
    end if;

    if new.status = 'confirmada' and new.data_confirmacao is null then
      new.data_confirmacao := current_date;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_lancamentos_valida_transicao on lancamentos;
create trigger trg_lancamentos_valida_transicao before update on lancamentos
  for each row execute function public.fn_validar_transicao_lancamento();

-- ============================================================
-- 8. State Machine de Pagamento
-- ============================================================

create or replace function public.fn_validar_transicao_pagamento() returns trigger
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
      when 'pendente' then new.status in ('pago','cancelado')
      when 'pago' then new.status in ('estornado')
      else false
    end;

    if not v_valida then
      raise exception 'Transição de status de pagamento inválida: % → %', old.status, new.status;
    end if;

    v_acao := case new.status
      when 'pago' then 'registrar_pagamento'
      when 'cancelado' then 'cancelar_pagamento'
      when 'estornado' then 'estornar_pagamento'
      else null
    end;

    if v_acao is not null and not public.pode('financeiro', v_acao) then
      raise exception 'Usuário sem permissão para a ação "%"', v_acao;
    end if;

    if new.status = 'pago' and new.data_pagamento is null then
      new.data_pagamento := current_date;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pagamentos_valida_transicao on pagamentos;
create trigger trg_pagamentos_valida_transicao before update on pagamentos
  for each row execute function public.fn_validar_transicao_pagamento();

-- Propagação simples (mesmo raciocínio de DEC-037 — sem Event Bus completo ainda): pagamento
-- confirmado empurra o lançamento de "prevista" para "confirmada" automaticamente, porque
-- receber/pagar de fato é a prova real de que o lançamento aconteceu.
create or replace function public.fn_propagar_status_pagamento() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and old.status is distinct from new.status and new.status = 'pago' then
    update lancamentos
    set status = 'confirmada', data_confirmacao = coalesce(data_confirmacao, current_date)
    where id = new.lancamento_id and status = 'prevista';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pagamentos_propaga_status on pagamentos;
create trigger trg_pagamentos_propaga_status after update on pagamentos
  for each row execute function public.fn_propagar_status_pagamento();

-- ============================================================
-- 9. Triggers: atualizado_em, auditoria, timeline
-- ============================================================

drop trigger if exists trg_contas_bancarias_atualizado_em on contas_bancarias;
create trigger trg_contas_bancarias_atualizado_em before update on contas_bancarias
  for each row execute function public.fn_set_atualizado_em();
drop trigger if exists trg_contas_bancarias_audit on contas_bancarias;
create trigger trg_contas_bancarias_audit after insert or update or delete on contas_bancarias
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_centros_custo_atualizado_em on centros_custo;
create trigger trg_centros_custo_atualizado_em before update on centros_custo
  for each row execute function public.fn_set_atualizado_em();
drop trigger if exists trg_centros_custo_audit on centros_custo;
create trigger trg_centros_custo_audit after insert or update or delete on centros_custo
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_lancamentos_atualizado_em on lancamentos;
create trigger trg_lancamentos_atualizado_em before update on lancamentos
  for each row execute function public.fn_set_atualizado_em();
drop trigger if exists trg_lancamentos_audit on lancamentos;
create trigger trg_lancamentos_audit after insert or update or delete on lancamentos
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_pagamentos_atualizado_em on pagamentos;
create trigger trg_pagamentos_atualizado_em before update on pagamentos
  for each row execute function public.fn_set_atualizado_em();
drop trigger if exists trg_pagamentos_audit on pagamentos;
create trigger trg_pagamentos_audit after insert or update or delete on pagamentos
  for each row execute function public.fn_audit_log();

create or replace function public.fn_timeline_lancamento() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
  v_entidade_tipo text;
begin
  v_entidade_tipo := case when new.tipo = 'receita' then 'lancamento_receita' else 'lancamento_despesa' end;
  if TG_OP = 'INSERT' then
    v_descricao := 'Lançamento criado: ' || new.descricao || ' (' || new.tipo || ', R$ ' || new.valor || ')';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, v_entidade_tipo, new.id, 'criacao', v_descricao, auth.uid());
  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_descricao := 'Status alterado de "' || old.status || '" para "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, v_entidade_tipo, new.id, 'status_alterado', v_descricao, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lancamentos_timeline on lancamentos;
create trigger trg_lancamentos_timeline after insert or update on lancamentos
  for each row execute function public.fn_timeline_lancamento();

-- Timeline do lançamento também recebe um evento quando um Pagamento vinculado muda de status
-- (a ação "pagou" é mais visível na linha do tempo do lançamento do que só na do pagamento).
create or replace function public.fn_timeline_pagamento() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo_lancamento lancamento_tipo;
  v_entidade_tipo text;
  v_descricao text;
begin
  if TG_OP = 'UPDATE' and old.status is distinct from new.status then
    select tipo into v_tipo_lancamento from lancamentos where id = new.lancamento_id;
    v_entidade_tipo := case when v_tipo_lancamento = 'receita' then 'lancamento_receita' else 'lancamento_despesa' end;
    v_descricao := 'Pagamento alterado de "' || old.status || '" para "' || new.status || '" (R$ ' || new.valor || ')';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, v_entidade_tipo, new.lancamento_id, 'pagamento_status_alterado', v_descricao, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pagamentos_timeline on pagamentos;
create trigger trg_pagamentos_timeline after update on pagamentos
  for each row execute function public.fn_timeline_pagamento();

-- ============================================================
-- 10. Storage: comprovantes/notas fiscais
-- ============================================================

insert into storage.buckets (id, name, public)
values ('financeiro-arquivos', 'financeiro-arquivos', false)
on conflict (id) do nothing;

drop policy if exists "financeiro-arquivos: select por empresa" on storage.objects;
create policy "financeiro-arquivos: select por empresa" on storage.objects
  for select using (
    bucket_id = 'financeiro-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );
drop policy if exists "financeiro-arquivos: insert por empresa" on storage.objects;
create policy "financeiro-arquivos: insert por empresa" on storage.objects
  for insert with check (
    bucket_id = 'financeiro-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );
drop policy if exists "financeiro-arquivos: delete por empresa" on storage.objects;
create policy "financeiro-arquivos: delete por empresa" on storage.objects
  for delete using (
    bucket_id = 'financeiro-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

-- ============================================================
-- 11. DEC-050 — fecha DEC-040 e DEC-041 (Motorista) e DEC-044 (Veículo)
-- ============================================================

alter table motoristas add column if not exists motivo_encerramento motorista_motivo_encerramento;
alter table veiculos add column if not exists motivo_baixa veiculo_motivo_baixa;

-- fn_propagar_status_contrato (DEC-037) ganha o caminho inverso que faltava (DEC-040):
-- contrato encerrando/cancelando move o motorista para "inativo" só se ele não tiver
-- nenhum outro contrato ativo/em renovação — nunca direto para "encerrado" (fim de
-- contrato não é fim de relação).
create or replace function public.fn_propagar_status_contrato() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'ativo' then
      update veiculos set status = 'alugado' where id = new.veiculo_id and status in ('disponivel','reservado');
      update motoristas set status = 'ativo' where id = new.motorista_id and status = 'em_analise';
    elsif new.status in ('encerrado','cancelado') then
      update veiculos set status = 'devolvido' where id = new.veiculo_id and status = 'alugado';

      update motoristas
      set status = 'inativo'
      where id = new.motorista_id
        and status = 'ativo'
        and not exists (
          select 1 from contratos c2
          where c2.motorista_id = new.motorista_id
            and c2.id <> new.id
            and c2.status in ('ativo','renovacao')
        );
    end if;
  end if;
  return new;
end;
$$;
