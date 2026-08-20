-- PrimeCharge OS — 0046 — CENTRO JURÍDICO Fase 5: histórico imutável de templates (2026-08-18)
-- ============================================================================================
-- ⚠️ NÃO APLICADA EM PRODUÇÃO. Validada só no harness local. Produção somente com autorização.
-- ============================================================================================
-- LACUNA ESTRUTURAL PROVADA (regra 27 da missão): contrato_templates guarda UM corpo — editar
-- ou importar o retorno do advogado sobrescreveria a minuta anterior para sempre, violando
-- "NUNCA sobrescrever a minuta anterior" (v1 enviada → v2 retorno advogado → v3 ajustes...).
-- As versões de CONTRATO (contrato_versoes) não servem: são documentos de contratos, não do
-- template. Nenhuma tabela existente armazena corpo histórico de template. Logo: tabela nova.
--
-- Desenho: um TRIGGER em contrato_templates fotografa o corpo ANTIGO toda vez que o corpo muda —
-- impossível perder versão por esquecimento de quem chama. A origem/observação da mudança são
-- passadas via set_config('app.template_origem'/'app.template_obs') pela API antes do UPDATE
-- (edição interna, retorno do advogado, ajuste); sem set_config, origem = 'edicao'.
-- ============================================================================================

create table if not exists contrato_template_versoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  template_id uuid not null references contrato_templates(id) on delete cascade,
  versao_template integer not null,          -- versão vigente NO MOMENTO da fotografia
  corpo text not null,                       -- o corpo ANTIGO (antes da mudança)
  hash_sha256 text,                          -- integridade do corpo fotografado (preenchido pela app)
  origem text not null default 'edicao'
    check (origem in ('edicao','retorno_advogado','ajuste_interno','publicacao','instalacao_biblioteca')),
  responsavel_id uuid references usuarios(id) on delete set null,
  responsavel_nome text,                     -- advogado externo sem login
  observacao text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_template_versoes_template on contrato_template_versoes(template_id, criado_em desc);

-- Imutabilidade do histórico: fotografia não se edita nem se apaga (regra: nunca perder versão).
create or replace function public.fn_bloquear_mudanca_historico_template() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  raise exception 'Histórico de template é imutável: fotografias não podem ser alteradas nem removidas.';
end; $$;

drop trigger if exists trg_template_versoes_imutavel on contrato_template_versoes;
create trigger trg_template_versoes_imutavel before update or delete on contrato_template_versoes
  for each row execute function public.fn_bloquear_mudanca_historico_template();

-- Fotografia automática: sempre que o CORPO do template muda, o corpo antigo entra no histórico.
create or replace function public.fn_snapshot_template_corpo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.corpo is distinct from old.corpo then
    insert into contrato_template_versoes (empresa_id, template_id, versao_template, corpo, hash_sha256, origem, responsavel_id, responsavel_nome, observacao)
    values (
      old.empresa_id, old.id, old.versao_template, old.corpo,
      encode(digest(old.corpo, 'sha256'), 'hex'),  -- pgcrypto (já usada p/ gen_random_uuid)
      coalesce(nullif(current_setting('app.template_origem', true), ''), 'edicao'),
      auth.uid(),
      nullif(current_setting('app.template_responsavel', true), ''),
      nullif(current_setting('app.template_obs', true), '')
    );
  end if;
  return new;
end; $$;

drop trigger if exists trg_template_snapshot_corpo on contrato_templates;
create trigger trg_template_snapshot_corpo before update on contrato_templates
  for each row execute function public.fn_snapshot_template_corpo();

-- atualização/auditoria padrão + RLS staff-only (motorista NUNCA vê template nem histórico)
drop trigger if exists trg_contrato_template_versoes_audit on contrato_template_versoes;
create trigger trg_contrato_template_versoes_audit after insert on contrato_template_versoes
  for each row execute function public.fn_audit_log();

alter table contrato_template_versoes enable row level security;
drop policy if exists "template_versoes: staff select" on contrato_template_versoes;
create policy "template_versoes: staff select" on contrato_template_versoes
  for select using (empresa_id = public.current_empresa_id() and public.eh_staff());
drop policy if exists "template_versoes: staff insert" on contrato_template_versoes;
create policy "template_versoes: staff insert" on contrato_template_versoes
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('contratos','editar'));

-- RPC de atualização de corpo COM metadados de origem (importação do retorno do advogado /
-- ajuste interno). SECURITY INVOKER: a RLS de contrato_templates continua valendo pra quem chama.
-- O set_config marca a fotografia que o trigger acima vai gravar.
create or replace function public.fn_atualizar_corpo_template(
  p_template_id uuid,
  p_corpo text,
  p_origem text,
  p_responsavel text default null,
  p_observacao text default null
) returns void
language plpgsql security invoker
as $$
begin
  if p_origem not in ('edicao','retorno_advogado','ajuste_interno') then
    raise exception 'Origem inválida para atualização de template: %', p_origem;
  end if;
  perform set_config('app.template_origem', p_origem, true);
  perform set_config('app.template_responsavel', coalesce(p_responsavel, ''), true);
  perform set_config('app.template_obs', coalesce(p_observacao, ''), true);
  update contrato_templates set corpo = p_corpo where id = p_template_id;
  if not found then
    raise exception 'Template não encontrado ou sem permissão.';
  end if;
end;
$$;
