-- PrimeCharge OS — 0043 — CENTRO JURÍDICO Fase 2: notificações + timeline de assinaturas (2026-08-18)
-- ============================================================================================
-- ⚠️ NÃO APLICADA EM PRODUÇÃO. Validada só no harness local. Produção somente com autorização.
-- ============================================================================================
-- NÃO altera a 0042 (fundação intocada). Só ADICIONA, reusando a infra existente:
--   • fn_criar_notificacao (0041) — notificações do App do Motorista.
--   • timeline_eventos — eventos de assinatura entram na MESMA timeline do contrato
--     (a 0042 já cobre eventos de VERSÃO; aqui cobrimos os de ASSINATURA — sem timeline paralela).
-- ============================================================================================

-- 'contrato' como tipo de notificação (enum criado na 0041).
alter type notificacao_tipo add value if not exists 'contrato';

-- Endereço da sede da empresa — o contrato qualifica a LOCADORA com endereço
-- ({{empresa.endereco}} na minuta) e a tabela empresas (0001) nunca teve essa coluna.
-- Coluna simples e opcional; nenhuma RLS/policy muda (empresas já é lida pelo staff).
alter table empresas add column if not exists endereco text;

-- =========================== 1. NOTIFICAÇÕES DE VERSÃO ======================================
-- Versão entra em aguardando_assinatura -> "Contrato aguardando sua assinatura."
-- Versão entra em vigente               -> "Seu contrato está vigente."
-- (Quem assina é notificado; demais transições são internas do staff, sem spam pro motorista.)
create or replace function public.fn_notif_contrato_versao() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_motorista uuid;
begin
  if TG_OP = 'UPDATE' and new.status is distinct from old.status
     and new.status in ('aguardando_assinatura','vigente') then
    select c.motorista_id into v_motorista from contratos c where c.id = new.contrato_id;
    if v_motorista is not null then
      perform public.fn_criar_notificacao(
        new.empresa_id, v_motorista, 'contrato',
        case new.status
          when 'aguardando_assinatura' then 'Contrato aguardando sua assinatura'
          else 'Seu contrato está vigente' end,
        case new.status
          when 'aguardando_assinatura' then 'Há um contrato pronto pra você revisar e assinar no app.'
          else 'A versão assinada do seu contrato entrou em vigência.' end,
        '/motorista/contrato');
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_notif_contrato_versao on contrato_versoes;
create trigger trg_notif_contrato_versao after update on contrato_versoes
  for each row execute function public.fn_notif_contrato_versao();

-- =========================== 2. TIMELINE DE ASSINATURAS =====================================
-- Cada mudança de status de assinatura vira evento na timeline do CONTRATO (mesma entidade
-- 'contrato' da 0042 — o cockpit mostra tudo numa linha só do tempo).
create or replace function public.fn_timeline_contrato_assinatura() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_contrato uuid; v_desc text;
begin
  if TG_OP = 'UPDATE' and new.status is distinct from old.status then
    select v.contrato_id into v_contrato from contrato_versoes v where v.id = new.contrato_versao_id;
    v_desc := format('Assinatura (%s): %s',
      case new.parte when 'motorista' then 'motorista' else 'PrimeCharge' end, new.status);
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, metadata, usuario_id, criado_em)
    values (new.empresa_id, 'contrato', v_contrato, 'contrato_assinatura', v_desc,
            jsonb_build_object('assinatura_id', new.id, 'parte', new.parte, 'status', new.status,
                               'motivo_recusa', new.motivo_recusa),
            auth.uid(), now());
  end if;
  return new;
end; $$;

drop trigger if exists trg_timeline_contrato_assinatura on contrato_assinaturas;
create trigger trg_timeline_contrato_assinatura after update on contrato_assinaturas
  for each row execute function public.fn_timeline_contrato_assinatura();
