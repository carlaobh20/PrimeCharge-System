-- PrimeCharge OS — 0044 — CENTRO JURÍDICO Fase 3: gestão do ciclo de vida contratual (2026-08-18)
-- ============================================================================================
-- ⚠️ NÃO APLICADA EM PRODUÇÃO. Validada só no harness local. Produção somente com autorização.
-- ============================================================================================
-- Princípio da fase (regra absoluta da missão): NENHUMA regra jurídica vive em código.
-- Tudo que é decisão de advogado vira DADO parametrizável (políticas, parâmetros, revisões).
-- 0042/0043 intocadas. Reuso: timeline_eventos, audit_log, fn_audit_log, fn_set_atualizado_em,
-- pode('contratos',...), eh_staff(), current_empresa_id(). Sem role novo (decisão futura
-- registrada — regra 29). Sem pg_cron (decisão antiga do projeto: nada de automação silenciosa;
-- alertas de expiração/renovação são DERIVADOS na leitura).
-- ============================================================================================

-- =========================== 1. POLÍTICA CONTRATUAL ==========================================
-- "Contrato motorista app", "Contrato elétrico mensal"... A política PARAMETRIZA: template,
-- campos obrigatórios, anexos obrigatórios e regras (jsonb livre p/ advogado/gestão definirem).
create table if not exists contrato_politicas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  template_id uuid references contrato_templates(id) on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho','ativa','arquivada')),
  campos_obrigatorios jsonb not null default '[]'::jsonb,  -- ex.: ["motorista.endereco","seguro.apolice"]
  anexos_obrigatorios jsonb not null default '[]'::jsonb,  -- ex.: ["cnh","apolice_seguro"]
  regras jsonb not null default '{}'::jsonb,               -- ex.: {"assinatura_prazo_dias":7}
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_contrato_politicas_empresa on contrato_politicas(empresa_id, status);

-- =========================== 2. SEGURO DO CONTRATO ===========================================
-- Coberturas em jsonb com três estados por item (true/false/ausente) — NUNCA assumimos
-- cobertura que não foi informada. A apólice em si vai pra `arquivos` (bucket existente).
create table if not exists contrato_seguros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  contrato_id uuid not null references contratos(id) on delete cascade,
  seguradora text,
  apolice text,
  vigencia_inicio date,
  vigencia_fim date,
  franquia_valor numeric(12,2),
  coberturas jsonb not null default '{}'::jsonb,  -- {"terceiros":true,"roubo_furto":true,"colisao":null,...}
  assistencia text,
  observacoes text,
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_contrato_seguros_contrato on contrato_seguros(contrato_id);

-- =========================== 3. RESCISÃO (workflow completo) =================================
create table if not exists contrato_rescisoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  contrato_id uuid not null references contratos(id) on delete cascade,
  status text not null default 'solicitada'
    check (status in ('solicitada','em_analise','aprovada','agendada','devolucao_pendente','devolvido','encerrada','cancelada')),
  motivo text not null,
  solicitante text not null default 'empresa' check (solicitante in ('motorista','empresa','acordo')),
  solicitado_por uuid references usuarios(id) on delete set null,
  responsavel_id uuid references usuarios(id) on delete set null,
  data_agendada date,
  -- Checklist de encerramento (regra 17). Chaves booleanas; o TRIGGER exige o núcleo obrigatório
  -- antes de 'encerrada'. Itens além do núcleo são acompanhamento operacional, não bloqueio.
  checklist jsonb not null default '{}'::jsonb,
  -- Apuração financeira (regra 18): valores REGISTRADOS pela operação (saldo, multas, danos,
  -- caução, créditos, débitos, valor_final). NENHUMA penalidade é calculada automaticamente —
  -- regra de multa rescisória é decisão de advogado ([VALIDAR COM ADVOGADO], parametrizável).
  valores jsonb not null default '{}'::jsonb,
  observacoes text,
  encerrada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_contrato_rescisoes_contrato on contrato_rescisoes(contrato_id);
-- No máximo UMA rescisão em andamento por contrato (histórico de canceladas/encerradas fica).
create unique index if not exists uq_rescisao_ativa_por_contrato on contrato_rescisoes(contrato_id)
  where status not in ('encerrada','cancelada');

create or replace function public.fn_validar_transicao_rescisao() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  if old.status = new.status then return new; end if;
  v_ok := case old.status
    when 'solicitada'         then new.status in ('em_analise','cancelada')
    when 'em_analise'         then new.status in ('aprovada','cancelada')
    when 'aprovada'           then new.status in ('agendada','cancelada')
    when 'agendada'           then new.status in ('devolucao_pendente','cancelada')
    when 'devolucao_pendente' then new.status in ('devolvido')
    when 'devolvido'          then new.status in ('encerrada')
    else false -- encerrada/cancelada são terminais
  end;
  if not v_ok then
    raise exception 'Transição de rescisão inválida: % -> %', old.status, new.status;
  end if;
  -- Núcleo obrigatório do checklist antes de encerrar (regra 17). O restante do checklist é
  -- acompanhamento; ESTES quatro são inegociáveis operacionalmente:
  if new.status = 'encerrada' then
    if not (coalesce((new.checklist->>'veiculo_devolvido')::boolean, false)
        and coalesce((new.checklist->>'vistoria_final')::boolean, false)
        and coalesce((new.checklist->>'pagamentos_verificados')::boolean, false)
        and coalesce((new.checklist->>'caucao_apurada')::boolean, false)) then
      raise exception 'Encerramento bloqueado: checklist obrigatório incompleto (veículo devolvido, vistoria final, pagamentos verificados, caução apurada).';
    end if;
    new.encerrada_em := now();
  end if;
  return new;
end; $$;

drop trigger if exists trg_rescisao_transicao on contrato_rescisoes;
create trigger trg_rescisao_transicao before update on contrato_rescisoes
  for each row execute function public.fn_validar_transicao_rescisao();

-- Timeline da rescisão (mesma timeline_eventos do contrato — nada paralelo).
create or replace function public.fn_timeline_rescisao() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_desc text;
begin
  if tg_op = 'INSERT' then
    v_desc := format('Rescisão solicitada (%s)', new.solicitante);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    v_desc := format('Rescisão: %s', new.status);
  else
    return new;
  end if;
  insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, metadata, usuario_id, criado_em)
  values (new.empresa_id, 'contrato', new.contrato_id, 'contrato_rescisao', v_desc,
          jsonb_build_object('rescisao_id', new.id, 'status', new.status, 'motivo', new.motivo), auth.uid(), now());
  return new;
end; $$;

drop trigger if exists trg_timeline_rescisao on contrato_rescisoes;
create trigger trg_timeline_rescisao after insert or update on contrato_rescisoes
  for each row execute function public.fn_timeline_rescisao();

-- =========================== 4. REVISÃO JURÍDICA (do template) ===============================
-- O sistema NÃO finge aprovação de advogado (regra 25): registra QUEM (usuário autorizado)
-- registrou a revisão de QUAL versão do template, com status e observações. O template só é
-- tratado como "aprovado juridicamente" quando existir revisão aprovada DA VERSÃO ATUAL.
create table if not exists contrato_revisoes_juridicas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  template_id uuid not null references contrato_templates(id) on delete cascade,
  versao_template integer not null,
  responsavel_id uuid references usuarios(id) on delete set null,
  responsavel_nome text,                          -- advogado externo sem login: registra o nome
  status text not null default 'pendente'
    check (status in ('pendente','em_analise','aprovado','aprovado_com_ressalvas','reprovado')),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_revisoes_template on contrato_revisoes_juridicas(template_id, versao_template);

-- =========================== 5. PARÂMETROS JURÍDICOS =========================================
-- Chave/valor por empresa — o lugar das decisões que o ADVOGADO define (manutenção, bateria,
-- LGPD, prazo de assinatura, janelas de renovação...). Nada disso vira comportamento jurídico
-- hard-coded; a UI lê e exibe/aplica operacionalmente.
create table if not exists juridico_parametros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  chave text not null,
  valor jsonb not null default '{}'::jsonb,
  atualizado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint uq_juridico_parametros unique (empresa_id, chave)
);

-- =========================== 6. EXPIRAÇÃO DE ASSINATURA ======================================
-- Prazo do convite (regra 12): expira_em definido no envio (a partir do parâmetro
-- 'assinatura_prazo_dias', quando configurado). Alertas 7/3/1 dias são DERIVADOS na fila do
-- dashboard (sem cron — decisão do projeto). Marcar 'expirado' é ação explícita do staff.
alter table contrato_assinaturas add column if not exists expira_em timestamptz;

-- =========================== 7. VERSIONAMENTO DO TEMPLATE ====================================
-- Republicar um template gera NOVA versão (regra 26). Contratos existentes ficam ligados à
-- versão anterior via snapshot._meta.template_versao (gravado na geração desde a Fase 2) — o
-- corpo deles já está congelado por versão (0042), nunca muda retroativamente.
alter table contrato_templates add column if not exists publicado_em timestamptz;

create or replace function public.fn_versao_template_publicacao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'publicado' and old.status is distinct from new.status then
    if old.publicado_em is not null then
      new.versao_template := old.versao_template + 1;  -- republicação = versão nova
    end if;
    new.publicado_em := now();
  end if;
  return new;
end; $$;

drop trigger if exists trg_template_publicacao on contrato_templates;
create trigger trg_template_publicacao before update on contrato_templates
  for each row execute function public.fn_versao_template_publicacao();

-- =========================== 8. atualizado_em + auditoria ====================================
do $$
declare t text;
begin
  foreach t in array array['contrato_politicas','contrato_seguros','contrato_rescisoes','contrato_revisoes_juridicas','juridico_parametros'] loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s;', t);
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function public.fn_set_atualizado_em();', t);
    execute format('drop trigger if exists trg_%1$s_audit on %1$s;', t);
    execute format('create trigger trg_%1$s_audit after insert or update or delete on %1$s for each row execute function public.fn_audit_log();', t);
  end loop;
end $$;

-- =========================== 9. RLS (staff-only; motorista NÃO acessa nada daqui) ============
alter table contrato_politicas          enable row level security;
alter table contrato_seguros            enable row level security;
alter table contrato_rescisoes          enable row level security;
alter table contrato_revisoes_juridicas enable row level security;
alter table juridico_parametros         enable row level security;

do $$
declare t text;
begin
  foreach t in array array['contrato_politicas','contrato_seguros','contrato_rescisoes','contrato_revisoes_juridicas','juridico_parametros'] loop
    execute format('drop policy if exists "%1$s: staff select" on %1$s;', t);
    execute format('create policy "%1$s: staff select" on %1$s for select using (empresa_id = public.current_empresa_id() and public.eh_staff());', t);
    execute format('drop policy if exists "%1$s: staff insert" on %1$s;', t);
    execute format('create policy "%1$s: staff insert" on %1$s for insert with check (empresa_id = public.current_empresa_id() and public.pode(''contratos'',''criar''));', t);
    execute format('drop policy if exists "%1$s: staff update" on %1$s;', t);
    execute format('create policy "%1$s: staff update" on %1$s for update using (empresa_id = public.current_empresa_id() and public.pode(''contratos'',''editar''));', t);
  end loop;
end $$;
