-- Épico 6 — "CRM PrimeCharge / Jornada do Motorista", Fase 1. Migration 0025.
--
-- Decisão de arquitetura confirmada com Carlos antes de escrever isto: `motoristas.status`
-- (6 valores) NÃO vira um enum de 14 estágios. Está amarrado demais — state machine com RBAC
-- embutido (fn_validar_transicao_motorista, migration 0008), propagação automática
-- Contrato→Motorista (fn_propagar_status_contrato, migrations 0005/0006) e ~10 pontos do
-- frontend comparam o valor literal. `etapa_funil` é um campo NOVO e SEPARADO — o Kanban de
-- CRM lê/escreve nele, `status` continua intocado e continua governando a regra de negócio
-- "dura" (motorista pode operar? pode ser bloqueado?).
--
-- Nenhuma sincronização automática por trigger entre `etapa_funil` e `status` nesta migration
-- — decisão deliberada, não esquecimento: forçar `status` a pular estágios (ex.: iria de
-- 'lead' direto pra 'ativo' se alguém arrastasse o card até "Motorista Ativo" sem passar pelas
-- etapas intermediárias) violaria a state machine existente (`fn_validar_transicao_motorista`
-- só permite lead→em_analise→ativo, nunca lead→ativo direto). Quem muda `status` continua
-- sendo só a ação explícita de status (como hoje) ou a propagação de contrato — o Kanban só
-- move `etapa_funil`. Se no futuro fizer sentido auto-avançar `status` quando `etapa_funil`
-- chega em certos pontos, isso é decisão de UX pra revisar depois de ver o Kanban funcionando,
-- não uma trigger de banco escrita às pressas agora.

do $$ begin
  create type motorista_etapa_funil as enum (
    'novo_lead','primeiro_contato','interessado','documentacao','analise_financeira',
    'analise_juridica','entrevista','aprovado','aguardando_veiculo','contrato_assinado',
    'entrega_veiculo','motorista_ativo','fidelizacao','encerrado'
  );
exception
  when duplicate_object then null;
end $$;

alter table motoristas add column if not exists etapa_funil motorista_etapa_funil;
alter table motoristas add column if not exists etapa_funil_desde timestamptz;
alter table motoristas add column if not exists responsavel_id uuid references usuarios(id) on delete set null;
alter table motoristas add column if not exists prioridade text not null default 'media' check (prioridade in ('baixa','media','alta','critica'));

comment on column motoristas.etapa_funil is
  'Épico 6, Fase 1 — coluna do Kanban de CRM. NULL para motoristas cadastrados antes desta '
  'migration (DEC-022, honestidade de dado: não reconstruímos por qual etapa cada lead '
  'histórico passou — seria inventado. A UI trata NULL como "Não classificado", uma faixa '
  'separada das 14 colunas, não uma 15ª etapa real). Independente de `status` — ver nota no '
  'topo do arquivo.';
comment on column motoristas.etapa_funil_desde is
  'Épico 6, Fase 1 — timestamp da última mudança de etapa_funil (mantido por trigger, nunca '
  'setado direto pela aplicação). Base real para "dias parado naquela etapa" no Kanban — NÃO '
  'usa atualizado_em pra isso (esse muda em qualquer edição do motorista, não só troca de '
  'etapa, e daria um número enganoso).';
comment on column motoristas.responsavel_id is 'Épico 6, Fase 1 — usuário interno responsável por este motorista/lead no funil. Mesmo padrão já usado em acoes_operacionais/checklists (migration 0007).';
comment on column motoristas.prioridade is 'Épico 6, Fase 1 — prioridade do lead/motorista no funil. text com check em vez de enum novo: mesmos 4 valores já usados em acao_prioridade (operacoes), sem criar um segundo enum idêntico.';

create index if not exists idx_motoristas_etapa_funil on motoristas(empresa_id, etapa_funil);
create index if not exists idx_motoristas_responsavel on motoristas(responsavel_id);

-- Nenhuma mudança de RLS necessária — a policy de select/update de `motoristas` já é por
-- empresa_id (migration 0004), cobre as colunas novas automaticamente.

-- ============================================================
-- Trigger: mantém etapa_funil_desde e espelha a troca de etapa na Timeline única (mesmo
-- padrão da Fase E.4/Consolidação do Épico 5 — cada mudança relevante já vira evento
-- consultável, e "Score mudou"/"Mudou etapa" (Etapa 10 do brief, eventos estruturados pra
-- automação futura) começam a existir de verdade a partir desta migration, não são só
-- promessa).
-- ============================================================

create or replace function public.fn_motorista_etapa_funil() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
begin
  if TG_OP = 'UPDATE' and old.etapa_funil is distinct from new.etapa_funil then
    new.etapa_funil_desde := now();
    v_descricao := 'Etapa do funil alterada de "' || coalesce(old.etapa_funil::text, 'não classificado')
      || '" para "' || coalesce(new.etapa_funil::text, 'não classificado') || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'motorista', new.id, 'etapa_funil_alterada', v_descricao, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_motoristas_etapa_funil on motoristas;
create trigger trg_motoristas_etapa_funil before update on motoristas
  for each row execute function public.fn_motorista_etapa_funil();
