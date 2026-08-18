-- PrimeCharge OS — 0042 — CENTRO JURÍDICO: ciclo de vida do contrato (2026-08-14)
-- ============================================================================================
-- ⚠️ ESTA MIGRATION NÃO FOI APLICADA EM PRODUÇÃO. Validada só no harness local (supabase/tests/).
--    Aplicar em produção SOMENTE após autorização explícita do Carlos (regra 59/79/85 da missão).
-- ============================================================================================
-- Espinha do Centro Jurídico. REUSA o que já existe e NÃO duplica:
--   • `contratos.status` (enum contrato_status: rascunho→em_analise→aprovado→assinado→ativo→
--     renovacao→encerrado/cancelado) continua sendo o CICLO do contrato — não criamos status
--     paralelo. A assinatura por parte é uma dimensão SEPARADA (contrato_assinaturas).
--   • `timeline_eventos` (timeline por entidade), `audit_log`/`fn_audit_log()` (auditoria),
--     `arquivos` (storage do PDF/anexos), `fn_set_atualizado_em()`.
--   • Permissões: `pode('contratos', ...)` + `eh_staff()` (NÃO criamos role 'juridico' — isso
--     alteraria o enum user_role e a RLS de todo o sistema; fica como decisão futura
--     [VALIDAR COM ADVOGADO/PRODUTO]).
--
-- O que é NOVO (não existia): o DOCUMENTO versionado, congelado e imutável, com snapshot dos
-- dados no momento da assinatura, hash de integridade, rastreio de assinatura com evidências,
-- e aditivos que nunca sobrescrevem o contrato original.
-- ============================================================================================

-- =========================== 1. TEMPLATES (minutas reutilizáveis) ===========================
create table if not exists contrato_templates (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  tipo text not null default 'padrao',                    -- 'padrao','eletrico','empresarial'... (texto livre)
  corpo text not null,                                    -- markdown/HTML com variáveis {{motorista.nome}} etc.
  variaveis jsonb not null default '[]'::jsonb,           -- chaves esperadas, para validação/preview
  status text not null default 'rascunho'
    check (status in ('rascunho','publicado','arquivado')),
  versao_template integer not null default 1,
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_contrato_templates_empresa on contrato_templates(empresa_id);

-- =========================== 2. VERSÕES (o documento versionado/imutável) ====================
create table if not exists contrato_versoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  contrato_id uuid not null references contratos(id) on delete cascade,
  template_id uuid references contrato_templates(id) on delete set null,
  numero integer not null,                                -- 1, 2, 3... (ordem da versão dentro do contrato)
  rotulo text,                                            -- 'v1.0', 'v1.1', 'v2.0 (aditivo)'...
  status text not null default 'rascunho'
    check (status in ('rascunho','em_revisao','aprovada','aguardando_assinatura','assinada','vigente','substituida','cancelada')),
  -- SNAPSHOT: dados congelados (motorista/veículo/condições) no momento da geração. O contrato
  -- histórico NUNCA muda quando o cadastro do motorista/veículo mudar depois. Fundamental p/ auditoria.
  snapshot jsonb not null default '{}'::jsonb,
  corpo text,                                             -- documento final renderizado (template + snapshot)
  hash_sha256 text,                                       -- integridade do corpo congelado
  congelada boolean not null default false,               -- true = conteúdo imutável (ver trigger)
  criado_por uuid references usuarios(id) on delete set null,
  aprovada_por uuid references usuarios(id) on delete set null,
  aprovada_em timestamptz,
  congelada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint uq_contrato_versoes_numero unique (contrato_id, numero)
);
create index if not exists idx_contrato_versoes_contrato on contrato_versoes(contrato_id);
create index if not exists idx_contrato_versoes_empresa_status on contrato_versoes(empresa_id, status);

-- =========================== 3. ASSINATURAS (rastreio + evidências) ==========================
create table if not exists contrato_assinaturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  contrato_versao_id uuid not null references contrato_versoes(id) on delete cascade,
  parte text not null check (parte in ('motorista','primecharge')),
  ordem integer not null default 1,
  signatario_usuario_id uuid references usuarios(id) on delete set null,
  status text not null default 'nao_enviado'
    check (status in ('nao_enviado','enviado','visualizado','aceito','assinado','recusado','expirado','cancelado')),
  -- EVIDÊNCIAS (quando disponíveis): ip, user_agent, email, telefone, hash, timestamps de eventos.
  -- Registrado como EVIDÊNCIA — não afirma valor probatório absoluto (integração com plataforma de
  -- assinatura especializada fica para depois; a arquitetura já aceita).
  evidencia jsonb not null default '{}'::jsonb,
  enviado_em timestamptz,
  visualizado_em timestamptz,
  assinado_em timestamptz,
  motivo_recusa text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint uq_contrato_assinaturas_parte unique (contrato_versao_id, parte)
);
create index if not exists idx_contrato_assinaturas_versao on contrato_assinaturas(contrato_versao_id);

-- =========================== 4. ADITIVOS (nunca sobrescrevem o original) =====================
create table if not exists contrato_aditivos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  contrato_id uuid not null references contratos(id) on delete cascade,
  contrato_versao_id uuid references contrato_versoes(id) on delete set null,  -- a versão-documento do aditivo
  tipo text not null default 'outro'
    check (tipo in ('valor','veiculo','prazo','motorista','renovacao','rescisao','outro')),
  descricao text,
  status text not null default 'rascunho'
    check (status in ('rascunho','vigente','cancelado')),
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_contrato_aditivos_contrato on contrato_aditivos(contrato_id);

-- =========================== 5. STATE MACHINE + IMUTABILIDADE ================================
-- Transições válidas da VERSÃO. Espelhado no frontend (contrato_versoes.ts). Bloqueia pulos.
create or replace function public.fn_validar_transicao_versao() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  if old.status = new.status then return new; end if;
  v_ok := case old.status
    when 'rascunho'               then new.status in ('em_revisao','cancelada')
    when 'em_revisao'             then new.status in ('aprovada','rascunho','cancelada')
    when 'aprovada'               then new.status in ('aguardando_assinatura','em_revisao','cancelada')
    when 'aguardando_assinatura'  then new.status in ('assinada','cancelada')
    when 'assinada'               then new.status in ('vigente','substituida')
    when 'vigente'                then new.status in ('substituida')
    else false  -- substituida/cancelada são terminais
  end;
  if not v_ok then
    raise exception 'Transição de versão inválida: % -> %', old.status, new.status;
  end if;
  -- Ao entrar em "aguardando_assinatura" a versão CONGELA (conteúdo imutável a partir daqui).
  if new.status = 'aguardando_assinatura' and not new.congelada then
    new.congelada := true;
    new.congelada_em := now();
  end if;
  if new.status = 'aprovada' and new.aprovada_em is null then
    new.aprovada_em := now();
  end if;
  return new;
end; $$;

-- Imutabilidade: depois de congelada, o CONTEÚDO não muda mais (snapshot/corpo/hash/numero/
-- template). Só metadados de fluxo (status/aprovação/assinatura) evoluem. Qualquer mudança de
-- conteúdo tem que virar uma NOVA versão — nunca editar a versão congelada.
create or replace function public.fn_bloquear_edicao_versao_congelada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.congelada and (
       new.snapshot     is distinct from old.snapshot
    or new.corpo        is distinct from old.corpo
    or new.hash_sha256  is distinct from old.hash_sha256
    or new.numero       is distinct from old.numero
    or new.template_id  is distinct from old.template_id
  ) then
    raise exception 'Versão congelada é imutável: crie uma nova versão em vez de editar o conteúdo.';
  end if;
  return new;
end; $$;

drop trigger if exists trg_contrato_versoes_transicao on contrato_versoes;
create trigger trg_contrato_versoes_transicao before update on contrato_versoes
  for each row execute function public.fn_validar_transicao_versao();

drop trigger if exists trg_contrato_versoes_imutavel on contrato_versoes;
create trigger trg_contrato_versoes_imutavel before update on contrato_versoes
  for each row execute function public.fn_bloquear_edicao_versao_congelada();

-- atualizado_em + auditoria (reuso das funções existentes) em todas as tabelas novas.
do $$
declare t text;
begin
  foreach t in array array['contrato_templates','contrato_versoes','contrato_assinaturas','contrato_aditivos'] loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s;', t);
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function public.fn_set_atualizado_em();', t);
    execute format('drop trigger if exists trg_%1$s_audit on %1$s;', t);
    execute format('create trigger trg_%1$s_audit after insert or update or delete on %1$s for each row execute function public.fn_audit_log();', t);
  end loop;
end $$;

-- =========================== 6. TIMELINE JURÍDICA ============================================
-- Espelha eventos de versão na timeline do CONTRATO (entidade_tipo='contrato'). Reusa timeline_eventos.
create or replace function public.fn_timeline_contrato_versao() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_desc text; v_contrato uuid; v_empresa uuid;
begin
  if tg_op = 'INSERT' then
    v_desc := format('Versão %s criada', coalesce(new.rotulo, 'v'||new.numero));
    v_contrato := new.contrato_id; v_empresa := new.empresa_id;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    v_desc := format('Versão %s: %s', coalesce(new.rotulo, 'v'||new.numero), new.status);
    v_contrato := new.contrato_id; v_empresa := new.empresa_id;
  else
    return new;
  end if;
  insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, metadata, usuario_id, criado_em)
  values (v_empresa, 'contrato', v_contrato, 'contrato_versao', v_desc,
          jsonb_build_object('versao_id', new.id, 'numero', new.numero, 'status', new.status), auth.uid(), now());
  return new;
end; $$;

drop trigger if exists trg_contrato_versoes_timeline on contrato_versoes;
create trigger trg_contrato_versoes_timeline after insert or update on contrato_versoes
  for each row execute function public.fn_timeline_contrato_versao();

-- =========================== 7. RLS ==========================================================
alter table contrato_templates   enable row level security;
alter table contrato_versoes      enable row level security;
alter table contrato_assinaturas  enable row level security;
alter table contrato_aditivos     enable row level security;

-- ---- Templates: staff da empresa ----
drop policy if exists "contrato_templates: staff select" on contrato_templates;
create policy "contrato_templates: staff select" on contrato_templates
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());
drop policy if exists "contrato_templates: staff insert" on contrato_templates;
create policy "contrato_templates: staff insert" on contrato_templates
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('contratos','criar'));
drop policy if exists "contrato_templates: staff update" on contrato_templates;
create policy "contrato_templates: staff update" on contrato_templates
  for update using (empresa_id = public.current_empresa_id() and public.pode('contratos','editar'));

-- ---- Versões: staff full; motorista lê SÓ as do próprio contrato em estado compartilhável ----
drop policy if exists "contrato_versoes: staff select" on contrato_versoes;
create policy "contrato_versoes: staff select" on contrato_versoes
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());
drop policy if exists "contrato_versoes: motorista ve as do proprio contrato" on contrato_versoes;
create policy "contrato_versoes: motorista ve as do proprio contrato" on contrato_versoes
  for select using (
    status in ('aguardando_assinatura','assinada','vigente')
    and exists (select 1 from contratos c where c.id = contrato_versoes.contrato_id and c.motorista_id = public.current_motorista_id())
  );
drop policy if exists "contrato_versoes: staff insert" on contrato_versoes;
create policy "contrato_versoes: staff insert" on contrato_versoes
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('contratos','criar'));
drop policy if exists "contrato_versoes: staff update" on contrato_versoes;
create policy "contrato_versoes: staff update" on contrato_versoes
  for update using (empresa_id = public.current_empresa_id() and public.pode('contratos','editar'));

-- ---- Assinaturas: staff full; motorista vê/assina SÓ a própria linha (parte='motorista') ----
drop policy if exists "contrato_assinaturas: staff select" on contrato_assinaturas;
create policy "contrato_assinaturas: staff select" on contrato_assinaturas
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());
drop policy if exists "contrato_assinaturas: motorista ve a propria" on contrato_assinaturas;
create policy "contrato_assinaturas: motorista ve a propria" on contrato_assinaturas
  for select using (
    parte = 'motorista'
    and exists (
      select 1 from contrato_versoes v join contratos c on c.id = v.contrato_id
      where v.id = contrato_assinaturas.contrato_versao_id and c.motorista_id = public.current_motorista_id()
    )
  );
drop policy if exists "contrato_assinaturas: staff insert" on contrato_assinaturas;
create policy "contrato_assinaturas: staff insert" on contrato_assinaturas
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('contratos','editar'));
drop policy if exists "contrato_assinaturas: staff update" on contrato_assinaturas;
create policy "contrato_assinaturas: staff update" on contrato_assinaturas
  for update using (empresa_id = public.current_empresa_id() and public.pode('contratos','editar'));
-- motorista atualiza SÓ a própria assinatura (aceitar/assinar/recusar) — sem trocar de parte nem de contrato.
drop policy if exists "contrato_assinaturas: motorista atualiza a propria" on contrato_assinaturas;
create policy "contrato_assinaturas: motorista atualiza a propria" on contrato_assinaturas
  for update using (
    parte = 'motorista'
    and exists (
      select 1 from contrato_versoes v join contratos c on c.id = v.contrato_id
      where v.id = contrato_assinaturas.contrato_versao_id and c.motorista_id = public.current_motorista_id()
    )
  ) with check (
    parte = 'motorista'
    and exists (
      select 1 from contrato_versoes v join contratos c on c.id = v.contrato_id
      where v.id = contrato_assinaturas.contrato_versao_id and c.motorista_id = public.current_motorista_id()
    )
  );

-- ---- Aditivos: staff full; motorista lê os do próprio contrato ----
drop policy if exists "contrato_aditivos: staff select" on contrato_aditivos;
create policy "contrato_aditivos: staff select" on contrato_aditivos
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());
drop policy if exists "contrato_aditivos: motorista ve os do proprio contrato" on contrato_aditivos;
create policy "contrato_aditivos: motorista ve os do proprio contrato" on contrato_aditivos
  for select using (
    exists (select 1 from contratos c where c.id = contrato_aditivos.contrato_id and c.motorista_id = public.current_motorista_id())
  );
drop policy if exists "contrato_aditivos: staff insert" on contrato_aditivos;
create policy "contrato_aditivos: staff insert" on contrato_aditivos
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('contratos','criar'));
drop policy if exists "contrato_aditivos: staff update" on contrato_aditivos;
create policy "contrato_aditivos: staff update" on contrato_aditivos
  for update using (empresa_id = public.current_empresa_id() and public.pode('contratos','editar'));

-- Permissão de contratos para os papéis de staff (idempotente) — motorista NÃO recebe.
insert into permissoes (role, modulo, acao, permitido)
select role::user_role, 'contratos', acao, true
from (values ('super_admin'),('owner'),('admin'),('gestor_frota')) as r(role)
cross join (values ('ver'),('criar'),('editar')) as a(acao)
on conflict (role, modulo, acao) do nothing;
insert into permissoes (role, modulo, acao, permitido) values
  ('gestor_financeiro','contratos','ver',true),
  ('operador','contratos','ver',true),
  ('operador','contratos','criar',true),
  ('operador','contratos','editar',true)
on conflict (role, modulo, acao) do nothing;
