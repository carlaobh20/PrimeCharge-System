-- PrimeCharge OS — Fase 0: Fundação (tenancy, usuários, permissões, auditoria)

create extension if not exists pgcrypto;

create table if not exists empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text unique,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

do $$ begin
  create type user_role as enum ('super_admin','owner','admin','gestor_frota','gestor_financeiro','operador','motorista');
exception
  when duplicate_object then null;
end $$;

create table if not exists usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade,
  nome_completo text,
  email text,
  role user_role not null default 'operador',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists permissoes (
  id uuid primary key default gen_random_uuid(),
  role user_role not null,
  modulo text not null,
  acao text not null,
  permitido boolean not null default true,
  unique(role, modulo, acao)
);

create table if not exists convites (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  email text not null,
  role user_role not null default 'operador',
  token uuid not null default gen_random_uuid(),
  aceito boolean not null default false,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '7 days')
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id) on delete set null,
  tabela text not null,
  registro_id uuid,
  acao text not null,
  dados_antigos jsonb,
  dados_novos jsonb,
  usuario_id uuid references usuarios(id),
  criado_em timestamptz not null default now()
);

-- índices multi-tenant
create index if not exists idx_usuarios_empresa on usuarios(empresa_id);
create index if not exists idx_convites_empresa on convites(empresa_id);
create index if not exists idx_audit_log_empresa on audit_log(empresa_id);

-- RLS
alter table empresas enable row level security;
alter table usuarios enable row level security;
alter table permissoes enable row level security;
alter table convites enable row level security;
alter table audit_log enable row level security;

create or replace function public.current_empresa_id() returns uuid
language sql stable
security definer
set search_path = public
as $$
  select empresa_id from usuarios where id = auth.uid();
$$;

drop policy if exists "empresa: ve a propria" on empresas;
create policy "empresa: ve a propria" on empresas
  for select using (id = public.current_empresa_id());

drop policy if exists "usuarios: ve colegas da empresa" on usuarios;
create policy "usuarios: ve colegas da empresa" on usuarios
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "usuarios: edita o proprio registro" on usuarios;
create policy "usuarios: edita o proprio registro" on usuarios
  for update using (id = auth.uid());

drop policy if exists "permissoes: leitura autenticada" on permissoes;
create policy "permissoes: leitura autenticada" on permissoes
  for select using (auth.role() = 'authenticated');

drop policy if exists "convites: visivel para a empresa" on convites;
create policy "convites: visivel para a empresa" on convites
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "audit_log: visivel para a empresa" on audit_log;
create policy "audit_log: visivel para a empresa" on audit_log
  for select using (empresa_id = public.current_empresa_id());
