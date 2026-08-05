-- PrimeCharge OS — Sprint 1: Módulo Veículos
-- Referência: FASE 1.1 (escopo completo do módulo), CORE_CONCEPTS.md seção 2 (State Machine do Veículo)
-- e seção 6 (Padrões obrigatórios: empresa_id + RLS + auditoria + timestamps + índices + policies).

-- ============================================================
-- 1. Catálogos globais: marcas e modelos
-- Decisão: NÃO são escopadas por empresa_id — são catálogo compartilhado entre todas as empresas
-- (marca/modelo de veículo é um dado de mundo real, não um dado de negócio de uma empresa específica).
-- RLS: leitura liberada a qualquer usuário autenticado; inserção liberada (cadastro inline de marca/modelo
-- novo pela tela de Veículos, sem precisar de CRUD dedicado — fora de escopo desta Sprint); sem update/delete
-- pela aplicação por ora.
-- ============================================================

create table if not exists marcas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_em timestamptz not null default now()
);

create table if not exists modelos (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references marcas(id) on delete restrict,
  nome text not null,
  criado_em timestamptz not null default now(),
  unique (marca_id, nome)
);

create index if not exists idx_modelos_marca on modelos(marca_id);

alter table marcas enable row level security;
alter table modelos enable row level security;

drop policy if exists "marcas: select autenticado" on marcas;
create policy "marcas: select autenticado" on marcas
  for select using (auth.role() = 'authenticated');

drop policy if exists "marcas: insert autenticado" on marcas;
create policy "marcas: insert autenticado" on marcas
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "modelos: select autenticado" on modelos;
create policy "modelos: select autenticado" on modelos
  for select using (auth.role() = 'authenticated');

drop policy if exists "modelos: insert autenticado" on modelos;
create policy "modelos: insert autenticado" on modelos
  for insert with check (auth.role() = 'authenticated');

-- Seed: marcas/modelos EV mais comuns no Brasil, para o formulário de Veículos não nascer vazio.
insert into marcas (nome) values
  ('BYD'), ('GWM'), ('Volvo'), ('BMW'), ('Chevrolet'),
  ('Renault'), ('Fiat'), ('Peugeot'), ('JAC'), ('Mercedes-Benz')
on conflict (nome) do nothing;

insert into modelos (marca_id, nome)
select m.id, v.nome from (values
  ('BYD', 'Dolphin'), ('BYD', 'Dolphin Mini'), ('BYD', 'Yuan Plus'), ('BYD', 'Seal'), ('BYD', 'King DM-i'),
  ('GWM', 'Ora 03'),
  ('Volvo', 'XC40 Recharge'), ('Volvo', 'C40 Recharge'),
  ('BMW', 'iX'), ('BMW', 'i4'),
  ('Chevrolet', 'Bolt EV'),
  ('Renault', 'Kwid E-Tech'), ('Renault', 'Zoe'),
  ('Fiat', 'Pulse Abarth'),
  ('Peugeot', 'e-208'),
  ('JAC', 'e-JS1'), ('JAC', 'iEV40'),
  ('Mercedes-Benz', 'EQA'), ('Mercedes-Benz', 'EQB')
) as v(marca_nome, nome)
join marcas m on m.nome = v.marca_nome
on conflict (marca_id, nome) do nothing;

-- ============================================================
-- 2. Enums
-- ============================================================

do $$ begin
  create type veiculo_status as enum (
    'novo','comprado','preparacao','disponivel','reservado','alugado','devolvido','manutencao','venda','encerrado'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type veiculo_categoria as enum (
    'hatch','sedan','suv','pickup','van','moto','onibus','caminhao','outro'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type tipo_aquisicao as enum (
    'compra_direta','financiamento','consorcio','leasing'
  );
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- 3. Tabela veiculos
-- Unicidade de chassi/renavam/placa é escopada por empresa_id, não global: são identificadores do
-- mundo real (fisicamente únicos), mas escopar por empresa evita que uma empresa tome erro de unique
-- violation por causa de uma linha de outra empresa que ela nem consegue ver via RLS. Registrado aqui
-- em vez de no Decision Log por ser detalhe de implementação, não decisão estrutural nova.
-- ============================================================

create table if not exists veiculos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  marca_id uuid not null references marcas(id),
  modelo_id uuid not null references modelos(id),

  ano_fabricacao smallint not null,
  ano_modelo smallint not null,
  chassi text not null,
  renavam text not null,
  placa text not null,
  cor text,
  categoria veiculo_categoria not null default 'outro',
  tipo_aquisicao tipo_aquisicao not null default 'compra_direta',
  status veiculo_status not null default 'novo',

  quilometragem integer not null default 0,
  autonomia_km integer,
  capacidade_bateria_kwh numeric(6,2),

  data_compra date,
  valor_compra numeric(12,2),
  valor_fipe numeric(12,2),
  valor_mercado numeric(12,2),
  valor_residual_estimado numeric(12,2),

  observacoes text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint uq_veiculos_chassi unique (empresa_id, chassi),
  constraint uq_veiculos_renavam unique (empresa_id, renavam),
  constraint uq_veiculos_placa unique (empresa_id, placa)
);

create index if not exists idx_veiculos_empresa on veiculos(empresa_id);
create index if not exists idx_veiculos_status on veiculos(empresa_id, status);
create index if not exists idx_veiculos_marca on veiculos(marca_id);
create index if not exists idx_veiculos_modelo on veiculos(modelo_id);

-- ============================================================
-- 4. RLS
-- ============================================================

alter table veiculos enable row level security;

drop policy if exists "veiculos: select por empresa" on veiculos;
create policy "veiculos: select por empresa" on veiculos
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "veiculos: insert por empresa" on veiculos;
create policy "veiculos: insert por empresa" on veiculos
  for insert with check (empresa_id = public.current_empresa_id());

drop policy if exists "veiculos: update por empresa" on veiculos;
create policy "veiculos: update por empresa" on veiculos
  for update using (empresa_id = public.current_empresa_id());

-- ============================================================
-- 5. Policy de exclusão (CORE_CONCEPTS.md, seção 3 — primeira instância concreta do padrão
-- `pode(usuario, acao, contexto) → boolean`)
-- ============================================================

create or replace function public.pode_excluir_veiculo(p_veiculo_id uuid) returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from veiculos v
    join usuarios u on u.id = auth.uid()
    where v.id = p_veiculo_id
      and v.empresa_id = u.empresa_id
      and u.role in ('super_admin','owner','admin')
  );
$$;

drop policy if exists "veiculos: delete restrito por role" on veiculos;
create policy "veiculos: delete restrito por role" on veiculos
  for delete using (public.pode_excluir_veiculo(id));

-- ============================================================
-- 6. Triggers: atualizado_em, auditoria, timeline
-- ============================================================

drop trigger if exists trg_veiculos_atualizado_em on veiculos;
create trigger trg_veiculos_atualizado_em before update on veiculos
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_veiculos_audit on veiculos;
create trigger trg_veiculos_audit after insert or update or delete on veiculos
  for each row execute function public.fn_audit_log();

create or replace function public.fn_timeline_veiculo() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
begin
  if TG_OP = 'INSERT' then
    v_descricao := 'Veículo cadastrado com status "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'veiculo', new.id, 'criacao', v_descricao, auth.uid());
  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_descricao := 'Status alterado de "' || old.status || '" para "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'veiculo', new.id, 'status_alterado', v_descricao, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_veiculos_timeline on veiculos;
create trigger trg_veiculos_timeline after insert or update on veiculos
  for each row execute function public.fn_timeline_veiculo();

-- ============================================================
-- 7. Storage: buckets de fotos e documentos do veículo
-- Privados, isolados por empresa via prefixo de pasta: {empresa_id}/{veiculo_id}/{arquivo}
-- ============================================================

insert into storage.buckets (id, name, public)
values ('veiculos-fotos', 'veiculos-fotos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('veiculos-documentos', 'veiculos-documentos', false)
on conflict (id) do nothing;

drop policy if exists "veiculos-fotos: select por empresa" on storage.objects;
create policy "veiculos-fotos: select por empresa" on storage.objects
  for select using (
    bucket_id = 'veiculos-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

drop policy if exists "veiculos-fotos: insert por empresa" on storage.objects;
create policy "veiculos-fotos: insert por empresa" on storage.objects
  for insert with check (
    bucket_id = 'veiculos-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

drop policy if exists "veiculos-fotos: delete por empresa" on storage.objects;
create policy "veiculos-fotos: delete por empresa" on storage.objects
  for delete using (
    bucket_id = 'veiculos-fotos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

drop policy if exists "veiculos-documentos: select por empresa" on storage.objects;
create policy "veiculos-documentos: select por empresa" on storage.objects
  for select using (
    bucket_id = 'veiculos-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

drop policy if exists "veiculos-documentos: insert por empresa" on storage.objects;
create policy "veiculos-documentos: insert por empresa" on storage.objects
  for insert with check (
    bucket_id = 'veiculos-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

drop policy if exists "veiculos-documentos: delete por empresa" on storage.objects;
create policy "veiculos-documentos: delete por empresa" on storage.objects
  for delete using (
    bucket_id = 'veiculos-documentos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );
