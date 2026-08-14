-- Épico 7 — Controladoria PrimeCharge, Sprint 1.5 (Cobrança recorrente).
--
-- Contexto: contratos já têm dia_vencimento/periodicidade/valor_periodico (migration 0005/0021)
-- mas nada os transforma em lançamento — cobrança é 100% manual hoje (achado B da auditoria de
-- 2026-08-11). Esta migration fecha só o elo Contrato → Lançamento recorrente, sem criar
-- infraestrutura de agendamento nova: o repositório já tem precedente explícito (migrations
-- 0006/0007) de EVITAR automação silenciosa via pg_cron — "chamar isso de automação seria
-- desonesto" quando o gatilho real é manual. Mantemos essa filosofia: uma função RPC que o
-- usuário aciona (botão "Gerar cobranças do mês"), não um cron invisível. Se no futuro Carlos
-- quiser agendamento de verdade, é decisão dele, explícita, não algo que a IA decide sozinha.
--
-- Escopo: apenas periodicidade = 'mensal' (é o que dia_vencimento pressupõe — um dia do mês).
-- 'diaria'/'semanal' ficam de fora nesta fase: o schema atual não tem informação suficiente
-- pra saber QUANDO no dia/semana gerar sem inventar uma regra nova — nunca chutamos.

-- 1. Idempotência: nunca duas cobranças automáticas para o mesmo contrato no mesmo mês. Índice
-- parcial (só sobre criado_via='automacao') garante isso mesmo se a função for chamada em
-- paralelo — não depende só da checagem lógica dentro da function.
create unique index if not exists idx_lancamentos_contrato_competencia_automacao
  on lancamentos (contrato_id, competencia)
  where criado_via = 'automacao' and contrato_id is not null;

-- 2. Função — gera, para uma empresa e uma competência (mês) alvo, um lançamento de receita
-- por contrato ativo com cobrança recorrente configurada, se ainda não existir um para aquele
-- contrato+mês. security invoker (padrão): roda com o papel de quem chama, então a RLS de
-- INSERT em lancamentos (pode('financeiro','criar')) já é quem decide se o usuário pode ou não
-- — nenhuma checagem de permissão duplicada aqui.
create or replace function fn_gerar_cobrancas_recorrentes(p_empresa_id uuid, p_competencia date default null)
returns table (contrato_id uuid, lancamento_id uuid, gerado boolean, motivo text)
language plpgsql
as $$
declare
  v_competencia date := coalesce(date_trunc('month', p_competencia)::date, date_trunc('month', current_date)::date);
  v_contrato record;
  v_dia integer;
  v_vencimento date;
  v_novo_id uuid;
  v_ultimo_dia integer;
begin
  for v_contrato in
    select c.id, c.veiculo_id, c.motorista_id, c.dia_vencimento, c.valor_periodico, c.periodicidade
    from contratos c
    where c.empresa_id = p_empresa_id
      and c.status = 'ativo'
      and c.periodicidade = 'mensal'
      and c.dia_vencimento is not null
      and c.valor_periodico is not null
  loop
    if exists (
      select 1 from lancamentos l
      where l.contrato_id = v_contrato.id and l.competencia = v_competencia and l.criado_via = 'automacao'
    ) then
      contrato_id := v_contrato.id;
      lancamento_id := null;
      gerado := false;
      motivo := 'ja_existe_para_esta_competencia';
      return next;
      continue;
    end if;

    v_ultimo_dia := extract(day from (v_competencia + interval '1 month' - interval '1 day'))::integer;
    v_dia := least(v_contrato.dia_vencimento, v_ultimo_dia);
    v_vencimento := v_competencia + (v_dia - 1) * interval '1 day';

    insert into lancamentos (
      empresa_id, tipo, descricao, valor, contrato_id, veiculo_id, motorista_id,
      data_prevista, competencia, criado_via
    ) values (
      p_empresa_id, 'receita', 'Cobrança recorrente — contrato ' || v_contrato.id, v_contrato.valor_periodico,
      v_contrato.id, v_contrato.veiculo_id, v_contrato.motorista_id,
      v_vencimento, v_competencia, 'automacao'
    )
    returning id into v_novo_id;

    contrato_id := v_contrato.id;
    lancamento_id := v_novo_id;
    gerado := true;
    motivo := 'gerado';
    return next;
  end loop;

  return;
end;
$$;
