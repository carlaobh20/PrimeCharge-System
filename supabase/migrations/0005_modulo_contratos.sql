-- PrimeCharge OS — Sprint 7: Módulo Contratos
-- Referência: docs/ARQUITETURA.md Fase 2, CORE_CONCEPTS.md seções 2/3/6, DEC-006 (Motorista =
-- Cliente final — Contrato liga Empresa → Motorista → Veículo, sem entidade Cliente separada).
--
-- Além do módulo em si, esta migration fecha duas pendências que o próprio DECISION_LOG.md
-- marcou como obrigatórias antes da Fase 2 (ver DEC-026 e DEC-027, e DEC-035/DEC-036 abaixo,
-- que registram o fechamento): Policy real de autorização por ação sensível (não só ocultação
-- de botão) e observabilidade mínima de erro (não dependente de ferramenta específica).

-- ============================================================
-- 1. Enum de status — State Machine do Contrato (CORE_CONCEPTS.md, seção 2)
-- Rascunho → Em análise → Aprovado → Assinado → Ativo → Renovação → Encerrado / Cancelado.
-- "encerrado" e "cancelado" são terminais — nenhuma transição sai deles.
-- ============================================================

do $$ begin
  create type contrato_status as enum (
    'rascunho','em_analise','aprovado','assinado','ativo','renovacao','encerrado','cancelado'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type contrato_periodicidade as enum ('diaria','semanal','mensal');
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- 2. Tabela contratos
-- Empresa → Motorista → Veículo (DEC-006). Um veículo só pode ter um contrato "ativo" por vez
-- (índice único parcial abaixo) — regra de negócio real, não só convenção de UI.
-- ============================================================

create table if not exists contratos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  veiculo_id uuid not null references veiculos(id) on delete restrict,
  motorista_id uuid not null references motoristas(id) on delete restrict,

  status contrato_status not null default 'rascunho',

  data_inicio date not null,
  data_fim_prevista date,
  data_fim_real date,

  periodicidade contrato_periodicidade not null default 'diaria',
  valor_periodico numeric(10,2) not null,
  valor_caucao numeric(12,2),

  km_inicial integer,
  km_final integer,
  -- Carga da bateria na entrega/devolução (%) — ligado diretamente ao achado de mercado
  -- registrado em PRODUCT_VISION.md (veículo elétrico devolvido descarregado e oferecido
  -- como disponível é a dor operacional nº 1 do setor). Nulo até a vistoria acontecer.
  carga_inicial_pct smallint,
  carga_final_pct smallint,

  observacoes text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint chk_contratos_carga_inicial check (carga_inicial_pct is null or (carga_inicial_pct between 0 and 100)),
  constraint chk_contratos_carga_final check (carga_final_pct is null or (carga_final_pct between 0 and 100)),
  constraint chk_contratos_valor_positivo check (valor_periodico > 0)
);

create index if not exists idx_contratos_empresa on contratos(empresa_id);
create index if not exists idx_contratos_status on contratos(empresa_id, status);
create index if not exists idx_contratos_veiculo on contratos(veiculo_id);
create index if not exists idx_contratos_motorista on contratos(motorista_id);

-- Regra de negócio real: um veículo não pode estar em dois contratos "ativo" simultaneamente.
create unique index if not exists uq_contratos_veiculo_ativo on contratos(veiculo_id) where status = 'ativo';

-- ============================================================
-- 3. RLS
-- ============================================================

alter table contratos enable row level security;

drop policy if exists "contratos: select por empresa" on contratos;
create policy "contratos: select por empresa" on contratos
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "contratos: insert por empresa" on contratos;
create policy "contratos: insert por empresa" on contratos
  for insert with check (empresa_id = public.current_empresa_id());

drop policy if exists "contratos: update por empresa" on contratos;
create policy "contratos: update por empresa" on contratos
  for update using (empresa_id = public.current_empresa_id());

create or replace function public.pode_excluir_contrato(p_contrato_id uuid) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from contratos c
    join usuarios u on u.id = auth.uid()
    where c.id = p_contrato_id
      and c.empresa_id = u.empresa_id
      and u.role in ('super_admin','owner','admin')
  );
$$;

drop policy if exists "contratos: delete restrito por role" on contratos;
create policy "contratos: delete restrito por role" on contratos
  for delete using (public.pode_excluir_contrato(id));

-- ============================================================
-- 4. Autorização por ação (fecha DEC-026 para as ações sensíveis do Contrato — ver DEC-035)
--
-- `permissoes` (role, modulo, acao, permitido) já existe desde a Fase 0 mas nunca teve
-- consumidor real no código (RLS isola empresa×empresa, não role×ação dentro da empresa).
-- `pode()` é genérica de propósito (module + action), para ser reaproveitada quando um módulo
-- futuro precisar do mesmo mecanismo — mas só é EXIGIDA agora nas transições de status do
-- Contrato (fn_validar_transicao_contrato abaixo). Veículos e Motoristas continuam usando
-- só a checagem por lista de roles (pode_excluir_veiculo/pode_excluir_motorista) — DEC-026
-- permanece parcialmente aberto para esses dois módulos, registrado explicitamente em DEC-035.
-- ============================================================

create or replace function public.pode(p_modulo text, p_acao text) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.permitido
      from permissoes p
      join usuarios u on u.role = p.role
      where u.id = auth.uid()
        and p.modulo = p_modulo
        and p.acao = p_acao
    ),
    false
  );
$$;

-- Matriz de permissão do módulo "contratos" — só linhas concedidas (ausência = negado,
-- via coalesce acima). super_admin/owner/admin têm tudo; gestor_frota conduz o ciclo
-- operacional do contrato mas não cancela nem exclui; gestor_financeiro só enxerga e
-- registra pagamento (papel financeiro, não decide o contrato); operador prepara rascunho
-- e manda para análise, não aprova/assina/ativa/encerra/cancela; motorista não tem acesso
-- (sem portal do motorista ainda — ARQUITETURA.md, Fase 8).
insert into permissoes (role, modulo, acao, permitido)
select role::user_role, 'contratos', acao, true
from (values
  ('super_admin'), ('owner'), ('admin')
) as r(role)
cross join (values
  ('ver'),('criar'),('editar'),('enviar_analise'),('aprovar'),('assinar'),
  ('ativar'),('renovar'),('encerrar'),('cancelar'),('excluir'),('registrar_pagamento')
) as a(acao)
on conflict (role, modulo, acao) do nothing;

insert into permissoes (role, modulo, acao, permitido) values
  ('gestor_frota','contratos','ver',true),
  ('gestor_frota','contratos','criar',true),
  ('gestor_frota','contratos','editar',true),
  ('gestor_frota','contratos','enviar_analise',true),
  ('gestor_frota','contratos','aprovar',true),
  ('gestor_frota','contratos','assinar',true),
  ('gestor_frota','contratos','ativar',true),
  ('gestor_frota','contratos','renovar',true),
  ('gestor_frota','contratos','encerrar',true),
  ('gestor_financeiro','contratos','ver',true),
  ('gestor_financeiro','contratos','registrar_pagamento',true),
  ('operador','contratos','ver',true),
  ('operador','contratos','criar',true),
  ('operador','contratos','editar',true),
  ('operador','contratos','enviar_analise',true)
on conflict (role, modulo, acao) do nothing;

-- ============================================================
-- 5. State Machine validada no banco, não só no client (CORE_CONCEPTS.md seção 2 já promete
-- isso — "transição inválida é rejeitada no banco, não só escondida na UI" — implementado
-- aqui pela primeira vez de fato). Cada transição exige a permissão correspondente via pode().
-- ============================================================

create or replace function public.fn_validar_transicao_contrato() returns trigger
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
      when 'rascunho' then new.status in ('em_analise','cancelado')
      when 'em_analise' then new.status in ('aprovado','cancelado')
      when 'aprovado' then new.status in ('assinado','cancelado')
      when 'assinado' then new.status in ('ativo','cancelado')
      when 'ativo' then new.status in ('renovacao','encerrado','cancelado')
      when 'renovacao' then new.status in ('ativo','encerrado','cancelado')
      else false
    end;

    if not v_valida then
      raise exception 'Transição de status inválida: % → %', old.status, new.status;
    end if;

    v_acao := case new.status
      when 'em_analise' then 'enviar_analise'
      when 'aprovado' then 'aprovar'
      when 'assinado' then 'assinar'
      when 'ativo' then 'ativar'
      when 'renovacao' then 'renovar'
      when 'encerrado' then 'encerrar'
      when 'cancelado' then 'cancelar'
      else null
    end;

    if v_acao is not null and not public.pode('contratos', v_acao) then
      raise exception 'Usuário sem permissão para a ação "%"', v_acao;
    end if;

    if new.status = 'encerrado' and new.data_fim_real is null then
      new.data_fim_real := current_date;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_contratos_valida_transicao on contratos;
create trigger trg_contratos_valida_transicao before update on contratos
  for each row execute function public.fn_validar_transicao_contrato();

-- ============================================================
-- 6. Propagação de status para Veículo/Motorista (ver DEC-037)
--
-- Decisão de manter simples (trigger direto), não um Event Bus completo — o mesmo raciocínio
-- já registrado em docs/ARQUITETURA.md 1.13 (Event Bus completo fica pra Fase 3/Financeiro,
-- quando existir volume real de efeito cross-domain). Contrato ativando aluga o veículo e
-- ativa o motorista (se a state machine de cada um permitir); contrato encerrando/cancelando
-- devolve o veículo — para "disponivel", não direto, porque a state machine do Veículo já
-- exige uma vistoria de devolução antes (alugado → devolvido → disponivel).
-- ============================================================

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
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contratos_propaga_status on contratos;
create trigger trg_contratos_propaga_status after update on contratos
  for each row execute function public.fn_propagar_status_contrato();

-- ============================================================
-- 7. Triggers: atualizado_em, auditoria, timeline
-- ============================================================

drop trigger if exists trg_contratos_atualizado_em on contratos;
create trigger trg_contratos_atualizado_em before update on contratos
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_contratos_audit on contratos;
create trigger trg_contratos_audit after insert or update or delete on contratos
  for each row execute function public.fn_audit_log();

create or replace function public.fn_timeline_contrato() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
begin
  if TG_OP = 'INSERT' then
    v_descricao := 'Contrato criado com status "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'contrato', new.id, 'criacao', v_descricao, auth.uid());
  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_descricao := 'Status alterado de "' || old.status || '" para "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'contrato', new.id, 'status_alterado', v_descricao, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contratos_timeline on contratos;
create trigger trg_contratos_timeline after insert or update on contratos
  for each row execute function public.fn_timeline_contrato();

-- ============================================================
-- 8. Storage: bucket de arquivos do contrato (já nomeado em docs/ARQUITETURA.md, seção 1.10)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('contratos-arquivos', 'contratos-arquivos', false)
on conflict (id) do nothing;

drop policy if exists "contratos-arquivos: select por empresa" on storage.objects;
create policy "contratos-arquivos: select por empresa" on storage.objects
  for select using (
    bucket_id = 'contratos-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

drop policy if exists "contratos-arquivos: insert por empresa" on storage.objects;
create policy "contratos-arquivos: insert por empresa" on storage.objects
  for insert with check (
    bucket_id = 'contratos-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

drop policy if exists "contratos-arquivos: delete por empresa" on storage.objects;
create policy "contratos-arquivos: delete por empresa" on storage.objects
  for delete using (
    bucket_id = 'contratos-arquivos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

-- ============================================================
-- 9. Observabilidade mínima (fecha DEC-027 — ver DEC-036)
-- Tabela genérica, independente de ferramenta (Sentry seria uma implementação futura por
-- cima disso, não substitui). Captura exceção não tratada com stack trace e contexto de
-- usuário/empresa, exatamente o que DEC-027 exige.
-- ============================================================

create table if not exists erros_sistema (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id) on delete set null,
  usuario_id uuid references usuarios(id) on delete set null,
  mensagem text not null,
  stack text,
  contexto jsonb,
  url text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_erros_sistema_empresa on erros_sistema(empresa_id, criado_em desc);

alter table erros_sistema enable row level security;

-- Insert liberado a qualquer autenticado (inclusive antes de resolver empresa_id, ex.: erro
-- na tela de login) — é telemetria de sistema, não dado de negócio; risco de abuso é baixo
-- e mitigável depois (rate limit) se necessário.
drop policy if exists "erros_sistema: insert autenticado" on erros_sistema;
create policy "erros_sistema: insert autenticado" on erros_sistema
  for insert with check (auth.role() = 'authenticated');

-- Leitura restrita a quem administra a empresa — não é informação operacional do dia a dia.
drop policy if exists "erros_sistema: select restrito por role" on erros_sistema;
create policy "erros_sistema: select restrito por role" on erros_sistema
  for select using (
    empresa_id = public.current_empresa_id()
    and exists (
      select 1 from usuarios u
      where u.id = auth.uid() and u.role in ('super_admin','owner','admin')
    )
  );
