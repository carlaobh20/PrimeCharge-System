-- PrimeCharge OS — 0050 — APP MOTORISTA: Configuração do Copiloto (Fase 16 — Fase B/U)
-- ============================================================================================
-- ⚠️ NÃO APLICADA EM PRODUÇÃO. Validada só no harness local (Postgres real). Produção somente
-- com autorização explícita.
-- ============================================================================================
-- JUSTIFICATIVA (auditoria de reuso, claude/auditoria-reuso-fase16-copiloto-2026-08-21.md):
-- - Critérios do semáforo (limiares de R$/km e R$/h, pesos de cada critério) são estado mutável
--   por motorista, mas são um DOMÍNIO diferente de motorista_meta_config (que é sobre a meta
--   mensal de custo de vida — dias de trabalho, renda/hora premissa, reserva). Misturar os dois
--   numa tabela só criaria acoplamento entre "quanto preciso ganhar por mês" e "o que é uma boa
--   corrida", que são perguntas independentes. Por isso tabela nova.
-- - TODO limiar aqui é opcional (nullable). Ausência de configuração NUNCA vira zero: o motor
--   (avaliarCorrida, Fase A) trata limiar ausente como "NÃO CONFIGURADO" e cai pro critério
--   seguinte disponível, nunca inventa um número. Isso é reforçado no audit script (Fase T).
-- - Nenhum peso pode, sozinho, dominar a avaliação sem transparência — isso é responsabilidade
--   do motor (Fase B), não do banco; aqui só guardamos os números que o motorista configurou.
-- - Mesma filosofia de RLS da 0047/0048/0049: 1 policy do dono por tabela; staff SEM policy;
--   SEM trigger de audit_log DE PROPÓSITO.
-- ============================================================================================

create table if not exists motorista_config_copiloto (
  motorista_id uuid primary key references motoristas(id) on delete cascade,

  -- limiares — nulos = "NÃO CONFIGURADO", nunca tratados como zero pelo motor.
  limiar_rpkm_bom numeric(6,2) check (limiar_rpkm_bom is null or limiar_rpkm_bom >= 0),
  limiar_rpkm_ruim numeric(6,2) check (limiar_rpkm_ruim is null or limiar_rpkm_ruim >= 0),
  limiar_rph_bom numeric(6,2) check (limiar_rph_bom is null or limiar_rph_bom >= 0),
  limiar_rph_ruim numeric(6,2) check (limiar_rph_ruim is null or limiar_rph_ruim >= 0),

  -- pesos relativos de cada critério na média ponderada — default 1 (peso igual), nunca 0 pra
  -- não zerar silenciosamente um critério (desativar um critério é feito via limiar nulo, não
  -- via peso zero, pra manter a UI honesta sobre o que está ligado).
  peso_rpkm numeric(3,2) not null default 1 check (peso_rpkm > 0),
  peso_rph numeric(3,2) not null default 1 check (peso_rph > 0),
  peso_rpcorrida numeric(3,2) not null default 1 check (peso_rpcorrida > 0),

  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);

do $$ begin
  create trigger trg_motorista_config_copiloto_updated
    before update on motorista_config_copiloto
    for each row execute function public.fn_set_atualizado_em();
exception when duplicate_object then null;
end $$;

-- =========================== RLS — EXCLUSIVA DO MOTORISTA DONO ==============================
alter table motorista_config_copiloto enable row level security;
drop policy if exists "motorista_config_copiloto: dono total" on motorista_config_copiloto;
create policy "motorista_config_copiloto: dono total" on motorista_config_copiloto
  for all
  using (motorista_id = public.current_motorista_id())
  with check (motorista_id = public.current_motorista_id());
