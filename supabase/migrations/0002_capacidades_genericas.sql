-- PrimeCharge OS — Sprint 1: Capacidades genéricas (arquivos, comentários, tags, timeline, favoritos)
-- + trigger genérico de auditoria (fn_audit_log), consumido por audit_log (já existe desde a Fase 0).
-- Referência: CORE_CONCEPTS.md, seção 1 (Capabilities) e seção 6 (Padrões obrigatórios).

-- ============================================================
-- 1. Função genérica de auditoria (fn_audit_log)
-- Anexada como trigger AFTER INSERT/UPDATE/DELETE em qualquer tabela que precise de auditoria.
-- Escreve em audit_log, que já existe desde 0001 mas não tinha nenhum trigger populando-a até agora.
-- ============================================================

create or replace function public.fn_audit_log() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_empresa_id := old.empresa_id;
  else
    v_empresa_id := new.empresa_id;
  end if;

  insert into audit_log (empresa_id, tabela, registro_id, acao, dados_antigos, dados_novos, usuario_id)
  values (
    v_empresa_id,
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    TG_OP,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    auth.uid()
  );

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

-- ============================================================
-- 2. Função genérica de atualizado_em (reaproveitada por todo módulo novo)
-- ============================================================

create or replace function public.fn_set_atualizado_em() returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- ============================================================
-- 3. Tabelas de capacidades genéricas
-- Todas chaveadas por (empresa_id, entidade_tipo, entidade_id) — CORE_CONCEPTS.md, seção 1.
-- ============================================================

create table if not exists arquivos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  entidade_tipo text not null,
  entidade_id uuid not null,
  categoria text,
  nome_arquivo text not null,
  caminho_storage text not null,
  tipo_mime text,
  tamanho_bytes bigint,
  usuario_id uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists comentarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  entidade_tipo text not null,
  entidade_id uuid not null,
  texto text not null,
  usuario_id uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  entidade_tipo text not null,
  entidade_id uuid not null,
  tag text not null,
  usuario_id uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (empresa_id, entidade_tipo, entidade_id, tag)
);

create table if not exists timeline_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  entidade_tipo text not null,
  entidade_id uuid not null,
  tipo text not null,
  descricao text not null,
  metadata jsonb,
  usuario_id uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists favoritos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  entidade_tipo text not null,
  entidade_id uuid not null,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (usuario_id, entidade_tipo, entidade_id)
);

-- ============================================================
-- 4. Índices
-- ============================================================

create index if not exists idx_arquivos_entidade on arquivos(empresa_id, entidade_tipo, entidade_id);
create index if not exists idx_comentarios_entidade on comentarios(empresa_id, entidade_tipo, entidade_id);
create index if not exists idx_tags_entidade on tags(empresa_id, entidade_tipo, entidade_id);
create index if not exists idx_timeline_entidade on timeline_eventos(empresa_id, entidade_tipo, entidade_id);
create index if not exists idx_favoritos_entidade on favoritos(empresa_id, entidade_tipo, entidade_id);
create index if not exists idx_favoritos_usuario on favoritos(usuario_id);

-- ============================================================
-- 5. RLS
-- ============================================================

alter table arquivos enable row level security;
alter table comentarios enable row level security;
alter table tags enable row level security;
alter table timeline_eventos enable row level security;
alter table favoritos enable row level security;

-- arquivos: visível/gerenciável por qualquer usuário da empresa
drop policy if exists "arquivos: select por empresa" on arquivos;
create policy "arquivos: select por empresa" on arquivos
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "arquivos: insert por empresa" on arquivos;
create policy "arquivos: insert por empresa" on arquivos
  for insert with check (empresa_id = public.current_empresa_id());

drop policy if exists "arquivos: delete por empresa" on arquivos;
create policy "arquivos: delete por empresa" on arquivos
  for delete using (empresa_id = public.current_empresa_id());

-- comentarios: leitura por empresa; edição/exclusão restrita ao autor
drop policy if exists "comentarios: select por empresa" on comentarios;
create policy "comentarios: select por empresa" on comentarios
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "comentarios: insert por empresa" on comentarios;
create policy "comentarios: insert por empresa" on comentarios
  for insert with check (empresa_id = public.current_empresa_id());

drop policy if exists "comentarios: update pelo autor" on comentarios;
create policy "comentarios: update pelo autor" on comentarios
  for update using (empresa_id = public.current_empresa_id() and usuario_id = auth.uid());

drop policy if exists "comentarios: delete pelo autor" on comentarios;
create policy "comentarios: delete pelo autor" on comentarios
  for delete using (empresa_id = public.current_empresa_id() and usuario_id = auth.uid());

-- tags: leitura/gestão por empresa
drop policy if exists "tags: select por empresa" on tags;
create policy "tags: select por empresa" on tags
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "tags: insert por empresa" on tags;
create policy "tags: insert por empresa" on tags
  for insert with check (empresa_id = public.current_empresa_id());

drop policy if exists "tags: delete por empresa" on tags;
create policy "tags: delete por empresa" on tags
  for delete using (empresa_id = public.current_empresa_id());

-- timeline_eventos: somente leitura pela app (escrita só via trigger, com security definer)
drop policy if exists "timeline: select por empresa" on timeline_eventos;
create policy "timeline: select por empresa" on timeline_eventos
  for select using (empresa_id = public.current_empresa_id());

-- favoritos: cada usuário só vê/gerencia os próprios
drop policy if exists "favoritos: select proprio" on favoritos;
create policy "favoritos: select proprio" on favoritos
  for select using (empresa_id = public.current_empresa_id() and usuario_id = auth.uid());

drop policy if exists "favoritos: insert proprio" on favoritos;
create policy "favoritos: insert proprio" on favoritos
  for insert with check (empresa_id = public.current_empresa_id() and usuario_id = auth.uid());

drop policy if exists "favoritos: delete proprio" on favoritos;
create policy "favoritos: delete proprio" on favoritos
  for delete using (empresa_id = public.current_empresa_id() and usuario_id = auth.uid());

-- ============================================================
-- 6. Auditoria das próprias tabelas de capacidade (exceto timeline_eventos e audit_log — auditar o log seria recursivo/redundante)
-- ============================================================

drop trigger if exists trg_arquivos_audit on arquivos;
create trigger trg_arquivos_audit after insert or update or delete on arquivos
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_comentarios_audit on comentarios;
create trigger trg_comentarios_audit after insert or update or delete on comentarios
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_comentarios_atualizado_em on comentarios;
create trigger trg_comentarios_atualizado_em before update on comentarios
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_tags_audit on tags;
create trigger trg_tags_audit after insert or delete on tags
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_favoritos_audit on favoritos;
create trigger trg_favoritos_audit after insert or delete on favoritos
  for each row execute function public.fn_audit_log();
