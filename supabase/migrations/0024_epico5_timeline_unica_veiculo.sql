-- Épico 5 — "Fleet Intelligence 360", Consolidação da Arquitetura, item 4 (Timeline única).
-- Migration 0024.
--
-- Auditoria encontrou: contrato, lançamento/pagamento e checklist já disparam evento de
-- Timeline hoje, mas gravam SÓ na própria entidade (entidade_tipo='contrato'/'lancamento_*'/
-- 'checklist') — nunca propagam pro veículo vinculado. Troca de motorista num contrato não
-- dispara evento nenhum, em lugar nenhum. Resultado real: a Timeline de um veículo específico
-- (`useTimeline('veiculo', id)`, já usada no Cockpit) hoje mostra bem menos do que a jornada
-- real do carro.
--
-- Esta migration só ALTERA (create or replace) 3 funções de trigger que já existem — nenhuma
-- tabela nova, nenhuma coluna nova. Cada uma passa a inserir um SEGUNDO evento (mirror) na
-- entidade dona real do dado, além do evento que já inseria antes (que continua existindo,
-- nada é removido — quem lê a timeline do contrato/lançamento/checklist continua vendo tudo
-- que via antes).
--
-- Documento (vencimento) e Seguro ficam DE FORA desta migration — não existe coluna de
-- vencimento em `arquivos` nem tabela de seguro no banco; resolver isso é decisão de schema
-- maior, não um ajuste de trigger. Confirmado com Carlos antes de escrever isto.

-- ============================================================
-- 1. Contrato → espelha na Timeline do veículo (criação, status, troca de motorista)
-- ============================================================

create or replace function public.fn_timeline_contrato() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
begin
  if TG_OP = 'INSERT' then
    v_descricao := 'Contrato criado com status "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'contrato', new.id, 'criacao', v_descricao, auth.uid());
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'veiculo', new.veiculo_id, 'contrato_criado', v_descricao, auth.uid());
  elsif TG_OP = 'UPDATE' then
    if old.status is distinct from new.status then
      v_descricao := 'Status alterado de "' || old.status || '" para "' || new.status || '"';
      insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
      values (new.empresa_id, 'contrato', new.id, 'status_alterado', v_descricao, auth.uid());
      insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
      values (new.empresa_id, 'veiculo', new.veiculo_id, 'contrato_status_alterado', v_descricao, auth.uid());
    end if;
    if old.motorista_id is distinct from new.motorista_id then
      v_descricao := 'Motorista do contrato alterado';
      insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
      values (new.empresa_id, 'veiculo', new.veiculo_id, 'motorista_alterado', v_descricao, auth.uid());
      insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
      values (new.empresa_id, 'motorista', new.motorista_id, 'motorista_alterado', v_descricao, auth.uid());
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- 2. Lançamento → espelha na Timeline do veículo quando `veiculo_id` está preenchido
-- ============================================================

create or replace function public.fn_timeline_lancamento() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
  v_entidade_tipo text;
begin
  v_entidade_tipo := case when new.tipo = 'receita' then 'lancamento_receita' else 'lancamento_despesa' end;
  if TG_OP = 'INSERT' then
    v_descricao := 'Lançamento criado: ' || new.descricao || ' (' || new.tipo || ', R$ ' || new.valor || ')';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, v_entidade_tipo, new.id, 'criacao', v_descricao, auth.uid());
    if new.veiculo_id is not null then
      insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
      values (new.empresa_id, 'veiculo', new.veiculo_id, 'lancamento_criado', v_descricao, auth.uid());
    end if;
  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_descricao := 'Status alterado de "' || old.status || '" para "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, v_entidade_tipo, new.id, 'status_alterado', v_descricao, auth.uid());
    if new.veiculo_id is not null then
      insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
      values (new.empresa_id, 'veiculo', new.veiculo_id, 'lancamento_status_alterado', v_descricao, auth.uid());
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.fn_timeline_pagamento() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo_lancamento lancamento_tipo;
  v_veiculo_id uuid;
  v_entidade_tipo text;
  v_descricao text;
begin
  if TG_OP = 'UPDATE' and old.status is distinct from new.status then
    select tipo, veiculo_id into v_tipo_lancamento, v_veiculo_id from lancamentos where id = new.lancamento_id;
    v_entidade_tipo := case when v_tipo_lancamento = 'receita' then 'lancamento_receita' else 'lancamento_despesa' end;
    v_descricao := 'Pagamento alterado de "' || old.status || '" para "' || new.status || '" (R$ ' || new.valor || ')';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, v_entidade_tipo, new.lancamento_id, 'pagamento_status_alterado', v_descricao, auth.uid());
    if v_veiculo_id is not null then
      insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
      values (new.empresa_id, 'veiculo', v_veiculo_id, 'pagamento_status_alterado', v_descricao, auth.uid());
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- 3. Checklist/vistoria → espelha na Timeline da entidade real (veiculo/motorista/...)
-- ============================================================
-- `checklists.entidade_tipo/entidade_id` já é a referência genérica pra quem o checklist
-- pertence (veiculo, motorista, etc. — mesmo padrão de timeline_eventos). O evento seguia só
-- em entidade_tipo='checklist'; passa a espelhar na entidade dona também, sem hardcode de
-- 'veiculo' — generaliza pra qualquer entidade que hoje ou no futuro tenha checklist.

create or replace function public.fn_timeline_checklist() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
begin
  if TG_OP = 'INSERT' then
    v_descricao := 'Checklist criado: ' || new.titulo;
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'checklist', new.id, 'criacao', v_descricao, auth.uid());
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, new.entidade_tipo, new.entidade_id, 'checklist_criado', v_descricao, auth.uid());
  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_descricao := 'Status alterado de "' || old.status || '" para "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'checklist', new.id, 'status_alterado', v_descricao, auth.uid());
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, new.entidade_tipo, new.entidade_id, 'checklist_status_alterado', v_descricao, auth.uid());
  end if;
  return new;
end;
$$;
