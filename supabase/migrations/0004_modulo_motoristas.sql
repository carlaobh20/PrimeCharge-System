-- PrimeCharge OS — Sprint 6: Módulo Motoristas
-- Modelo A confirmado por Carlos nesta sprint (ver DEC-006, atualizada): Motorista = Cliente
-- final da locação — não existe uma entidade Cliente separada. Contrato (futuro, fora de
-- escopo desta sprint) vai se relacionar direto a Motorista, como já estava assumido desde
-- a Fase 0. Segue o mesmo padrão de 0003_modulo_veiculos.sql (empresa_id + RLS + auditoria +
-- timestamps + índices + State Machine), ver DEC-025.

-- ============================================================
-- 1. Enum de status — State Machine do Motorista (CORE_CONCEPTS.md, seção 2)
-- Sem Contrato construído ainda, o status é setado manualmente via Command Action
-- (mesmo padrão que veiculo.status usava antes de qualquer módulo de negócio existir).
-- ============================================================

do $$ begin
  create type motorista_status as enum (
    'lead','em_analise','ativo','inativo','bloqueado','encerrado'
  );
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- 2. Tabela motoristas
-- Unicidade de CPF escopada por empresa_id, não global — mesmo racional do DEC-018
-- (chassi/renavam/placa): RLS já impede uma empresa de ver a linha de outra, então um
-- unique global geraria erro sem explicação visível pro usuário.
-- ============================================================

create table if not exists motoristas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  nome_completo text not null,
  cpf text not null,
  email text,
  telefone text,
  data_nascimento date,

  cnh_numero text,
  cnh_categoria text,
  cnh_validade date,

  status motorista_status not null default 'lead',

  endereco text,
  cidade text,
  estado text,

  observacoes text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint uq_motoristas_cpf unique (empresa_id, cpf)
);

create index if not exists idx_motoristas_empresa on motoristas(empresa_id);
create index if not exists idx_motoristas_status on motoristas(empresa_id, status);

-- ============================================================
-- 3. RLS
-- ============================================================

alter table motoristas enable row level security;

drop policy if exists "motoristas: select por empresa" on motoristas;
create policy "motoristas: select por empresa" on motoristas
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "motoristas: insert por empresa" on motoristas;
create policy "motoristas: insert por empresa" on motoristas
  for insert with check (empresa_id = public.current_empresa_id());

drop policy if exists "motoristas: update por empresa" on motoristas;
create policy "motoristas: update por empresa" on motoristas
  for update using (empresa_id = public.current_empresa_id());

-- ============================================================
-- 4. Policy de exclusão (mesmo padrão de pode_excluir_veiculo)
-- ============================================================

create or replace function public.pode_excluir_motorista(p_motorista_id uuid) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from motoristas m
    join usuarios u on u.id = auth.uid()
    where m.id = p_motorista_id
      and m.empresa_id = u.empresa_id
      and u.role in ('super_admin','owner','admin')
  );
$$;

drop policy if exists "motoristas: delete restrito por role" on motoristas;
create policy "motoristas: delete restrito por role" on motoristas
  for delete using (public.pode_excluir_motorista(id));

-- ============================================================
-- 5. Triggers: atualizado_em, auditoria, timeline
-- ============================================================

drop trigger if exists trg_motoristas_atualizado_em on motoristas;
create trigger trg_motoristas_atualizado_em before update on motoristas
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_motoristas_audit on motoristas;
create trigger trg_motoristas_audit after insert or update or delete on motoristas
  for each row execute function public.fn_audit_log();

create or replace function public.fn_timeline_motorista() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
begin
  if TG_OP = 'INSERT' then
    v_descricao := 'Motorista cadastrado com status "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'motorista', new.id, 'criacao', v_descricao, auth.uid());
  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_descricao := 'Status alterado de "' || old.status || '" para "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'motorista', new.id, 'status_alterado', v_descricao, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_motoristas_timeline on motoristas;
create trigger trg_motoristas_timeline after insert or update on motoristas
  for each row execute function public.fn_timeline_motorista();

-- ============================================================
-- 6. Storage: bucket de documentos do motorista (CNH, comprovante de residência...)
-- Sem bucket de "fotos de capa" como veiculos-fotos — motorista não tem uma foto de capa
-- no header do Cockpit nesta sprint (avatar por iniciais, ver MotoristaCockpitHeader).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('motoristas-documentos', 'motoristas-documentos', false)
on conflict (id) do nothing;

drop policy if exists "motoristas-documentos: select por empresa" on storage.objects;
create policy "motoristas-documentos: select por empresa" on storage.objects
  for select using (
    bucket_id = 'motoristas-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

drop policy if exists "motoristas-documentos: insert por empresa" on storage.objects;
create policy "motoristas-documentos: insert por empresa" on storage.objects
  for insert with check (
    bucket_id = 'motoristas-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

drop policy if exists "motoristas-documentos: delete por empresa" on storage.objects;
create policy "motoristas-documentos: delete por empresa" on storage.objects
  for delete using (
    bucket_id = 'motoristas-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );
