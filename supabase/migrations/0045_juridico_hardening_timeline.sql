-- PrimeCharge OS — 0045 — CENTRO JURÍDICO Fase 4: hardening + timeline completa (2026-08-18)
-- ============================================================================================
-- ⚠️ NÃO APLICADA EM PRODUÇÃO. Validada só no harness local. Produção somente com autorização.
-- ============================================================================================

-- =========================== 1. HARDENING: motorista INATIVO ================================
-- ACHADO da auditoria da Fase 4 (Fase Y da missão): current_motorista_id() não checava
-- usuarios.ativo — um usuário-motorista DESATIVADO (ativo=false) continuava resolvendo o próprio
-- motorista_id e, portanto, lendo contrato/versões/assinaturas e até assinando pela RLS.
-- eh_staff() sempre checou ativo; a função do motorista não. Correção: motorista desativado
-- passa a não resolver id nenhum -> todas as policies baseadas em current_motorista_id()
-- retornam vazio. (Mesma assinatura/semântica; nenhuma policy precisa mudar.)
create or replace function public.current_motorista_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select motorista_id from usuarios where id = auth.uid() and role = 'motorista' and ativo = true;
$$;

-- =========================== 2. TIMELINE: seguro + documento (Fase W) =======================
-- Cobertura de eventos que faltava na timeline do contrato (mesma timeline_eventos — nada novo).
create or replace function public.fn_timeline_contrato_seguro() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_desc text;
begin
  if tg_op = 'INSERT' then
    v_desc := format('Seguro cadastrado%s', case when new.seguradora is not null then ' — '||new.seguradora else '' end);
  elsif tg_op = 'UPDATE' and (new.apolice is distinct from old.apolice
        or new.vigencia_fim is distinct from old.vigencia_fim
        or new.seguradora is distinct from old.seguradora) then
    v_desc := 'Seguro atualizado (apólice/vigência/seguradora)';
  else
    return new;
  end if;
  insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, metadata, usuario_id, criado_em)
  values (new.empresa_id, 'contrato', new.contrato_id, 'contrato_seguro', v_desc,
          jsonb_build_object('seguro_id', new.id, 'apolice', new.apolice, 'vigencia_fim', new.vigencia_fim),
          auth.uid(), now());
  return new;
end; $$;

drop trigger if exists trg_timeline_contrato_seguro on contrato_seguros;
create trigger trg_timeline_contrato_seguro after insert or update on contrato_seguros
  for each row execute function public.fn_timeline_contrato_seguro();

-- Documento anexado ao CONTRATO vira evento (só entidade_tipo='contrato' — não spamamos a
-- timeline com uploads de outras entidades, que têm as próprias timelines).
create or replace function public.fn_timeline_contrato_documento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.entidade_tipo = 'contrato' then
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, metadata, usuario_id, criado_em)
    values (new.empresa_id, 'contrato', new.entidade_id, 'contrato_documento',
            format('Documento anexado: %s%s', new.nome_arquivo,
                   case when new.categoria is not null then ' ('||new.categoria||')' else '' end),
            jsonb_build_object('arquivo_id', new.id, 'categoria', new.categoria), auth.uid(), now());
  end if;
  return new;
end; $$;

drop trigger if exists trg_timeline_contrato_documento on arquivos;
create trigger trg_timeline_contrato_documento after insert on arquivos
  for each row execute function public.fn_timeline_contrato_documento();
