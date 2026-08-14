-- Harness de teste local (Fase 1 — Segurança do Portal do Motorista, 2026-08-14)
-- Emula o MÍNIMO do ambiente Supabase necessário pra rodar as migrations reais num Postgres
-- puro e testar RLS: schemas auth/storage, auth.uid(), storage.foldername(), roles.
-- NUNCA aplicar em produção — é só pro banco descartável de teste (ver rodar_testes.sh).

create extension if not exists pgcrypto;

-- ---- roles do Supabase ----
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

-- ---- schema auth ----
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Idêntico ao do Supabase: lê o sub do JWT da sessão (nós setamos via set_config nos testes)
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role() returns text
language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

-- ---- schema storage ----
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);

alter table storage.objects enable row level security;

-- Idêntico ao do Supabase Storage: tokens do path MENOS o último (o nome do arquivo)
create or replace function storage.foldername(name text) returns text[]
language sql immutable
as $$
  select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1];
$$;

-- ---- grants (o Supabase concede isso por default pros roles da API) ----
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant select on auth.users to authenticated;
grant all on storage.buckets to authenticated, service_role;
grant all on storage.objects to authenticated, service_role;

-- As tabelas de public são criadas pelas migrations DEPOIS deste shim — default privileges
-- garantem que authenticated enxergue todas (RLS continua decidindo linha a linha).
alter default privileges in schema public grant all on tables to authenticated, service_role;
alter default privileges in schema public grant all on sequences to authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
