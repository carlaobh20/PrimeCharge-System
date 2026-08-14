-- Épico 8 — Vistoria real de entrega/devolução. Migration 0030.
--
-- ETAPA 0 desta missão foi auditar antes de alterar (ver relatório da sessão). Achado central:
-- a estrutura de vistoria já existe inteira desde as migrations 0007/0010/0022 (checklists,
-- checklist_itens, tipo, odometro_km, carga_pct, foto_url, assinatura_url, bucket
-- checklists-fotos) mas está "parcialmente morta" — nenhum frontend grava tipo/odometro/carga/
-- foto, e a vistoria nunca é o que dispara a mudança de status do contrato/veículo (isso é
-- feito por AtivarContratoDialog/EncerrarContratoDialog, direto, sem vistoria nenhuma). Esta
-- migration NÃO cria uma tabela nova nem uma state machine nova — estende as duas state
-- machines que já existem (fn_validar_transicao_checklist e a cadeia contrato→veículo) para
-- que a VISTORIA seja a fonte de verdade, conforme pedido explícito da ETAPA 1.
--
-- Decisões de design (ETAPA 1 pedia para eu avaliar e justificar):
-- 1. NÃO adicionei `vistoria_entrega_id`/`vistoria_devolucao_id` em `contratos`. checklists já
--    tem `entidade_tipo`/`entidade_id` (aponta pro veículo — mesmo padrão do ChecklistsPanel
--    existente, que já lista o histórico de checklist por veículo) e ganha aqui `contrato_id`
--    e `motorista_id` como colunas diretas (não mais só o par genérico entidade_tipo/id, que
--    só suporta UMA entidade por linha). Buscar "a vistoria de entrega deste contrato" vira
--    `select * from checklists where contrato_id = X and tipo = 'entrega'` — direto, indexado,
--    sem precisar de FK no sentido contrário. Criar as duas FKs em contratos seria exatamente
--    a "duplicação de relacionamento" que a REGRA DE NÃO DUPLICAÇÃO pede pra evitar.
-- 2. `checklist_anterior_id` (migration 0010, nunca usado) é reaproveitado para a comparação
--    entrega↔devolução (ETAPA 5): a vistoria de devolução é criada apontando
--    `checklist_anterior_id` para a vistoria de entrega do MESMO contrato. Isso resolve
--    corretamente o caso de contrato com múltiplos ciclos entrega/devolução (renovação) sem
--    ambiguidade — meu contrato_id+tipo por si só não distinguiria qual entrega pareia com
--    qual devolução ao longo do tempo, o par explícito resolve isso.
-- 3. `checklist_itens.aplicavel` (novo) — ETAPA 8 pede tri-state (OK / Não OK / Não se aplica).
--    `resposta` continua boolean (OK/Não OK) — `aplicavel = false` é o terceiro estado, sem
--    precisar converter a coluna existente pra enum.
-- 4. Destino do veículo na devolução (ETAPA 4, A/B/C) é uma decisão humana no momento da
--    vistoria, não inferida automaticamente — `checklists.destino_veiculo` usa o ENUM
--    `veiculo_status` que já existe (sem estado novo, conforme pedido), restrito a
--    'disponivel'/'manutencao' pela state machine do veículo (0008) — as únicas duas saídas
--    válidas de 'devolvido'. "C — Sinistro" não é um status de veículo à parte (não existe na
--    state machine) — é sinalizado por `houve_sinistro`, que gera um registro mínimo na tabela
--    `sinistros` já existente (Épico 5, migration 0023) e força destino='manutencao'. Não
--    implementei o restante do fluxo de sinistro (franquia, seguradora, valor) — ETAPA 16
--    exclui isso explicitamente deste épico; o registro criado aqui é só o suficiente pra não
--    perder o evento, editável depois na tela de sinistros que já existe.

-- ============================================================
-- 1. Colunas novas em checklists — traçabilidade direta contrato/motorista, observação geral,
--    e decisão de destino do veículo na devolução.
-- ============================================================

alter table checklists add column if not exists contrato_id uuid references contratos(id) on delete set null;
alter table checklists add column if not exists motorista_id uuid references motoristas(id) on delete set null;
alter table checklists add column if not exists observacoes text;
alter table checklists add column if not exists destino_veiculo veiculo_status;
alter table checklists add column if not exists houve_sinistro boolean not null default false;
-- Não existe portal do motorista (ARQUITETURA.md, Fase 8) — "confirmação do motorista" nesta
-- fase é o operador, com o motorista fisicamente presente, marcando que os dados foram
-- conferidos com ele antes de assinar. Vira certificação real quando o portal existir.
alter table checklists add column if not exists confirmacao_motorista boolean not null default false;

comment on column checklists.contrato_id is 'Épico 8 — vínculo direto pra vistoria de entrega/devolução (nulo para checklist não ligado a contrato, ex. vistoria semanal/manutenção).';
comment on column checklists.motorista_id is 'Épico 8 — motorista presente na vistoria (nulo quando não aplicável).';
comment on column checklists.observacoes is 'Épico 8 — observação geral da vistoria, distinta da observação por item (checklist_itens.observacao).';
comment on column checklists.destino_veiculo is 'Épico 8 — decisão do operador na vistoria de devolução: disponivel ou manutencao (as únicas transições válidas de veiculo_status a partir de "devolvido"). Nulo para outros tipos de checklist.';
comment on column checklists.houve_sinistro is 'Épico 8 — quando true na conclusão de uma vistoria de devolução, gera um registro mínimo em `sinistros` e força destino_veiculo=manutencao.';
comment on column checklists.confirmacao_motorista is 'Épico 8 — operador confirma que os dados da vistoria foram conferidos com o motorista presente. Sem portal do motorista ainda, não é uma assinatura eletrônica de aceite separada da assinatura em si.';

create index if not exists idx_checklists_contrato on checklists(contrato_id) where contrato_id is not null;
create index if not exists idx_checklists_motorista on checklists(motorista_id) where motorista_id is not null;

-- Evita duas vistorias de entrega (ou de devolução) abertas ao mesmo tempo pro mesmo contrato —
-- mesmo raciocínio de idempotência da migration 0029, aplicado aqui à criação, não à geração.
create unique index if not exists uq_checklists_contrato_tipo_aberto
  on checklists(contrato_id, tipo)
  where status = 'aberto' and tipo in ('entrega', 'devolucao') and contrato_id is not null;

-- ============================================================
-- 2. checklist_itens.aplicavel — terceiro estado do item (ETAPA 8), sem converter `resposta`.
-- ============================================================

alter table checklist_itens add column if not exists aplicavel boolean not null default true;
comment on column checklist_itens.aplicavel is 'Épico 8 — false = "não se aplica" (resposta/foto deixam de ser exigidas neste item, independente de obrigatorio).';

-- ============================================================
-- 2.1 Achado real da ETAPA 0 (auditoria antes de alterar), não uma decisão de design: o
-- arquivo local da migration 0002 tem `fn_audit_log()` acessando `new.empresa_id` direto, o
-- que quebra em qualquer INSERT/UPDATE/DELETE em `checklist_itens` (a única tabela auditada
-- sem coluna empresa_id própria — confirmado via information_schema contra as 26 tabelas com
-- trigger `_audit`). Introspecção direta em produção mostrou que a função REAL já não tem
-- esse bug (foi corrigida em algum momento sem migration correspondente — mesmo tipo de drift
-- já visto na migration 0028/permissoes nesta sessão) — mas a correção real em produção só
-- evita o crash, sem resolver o empresa_id: os 185 registros de auditoria de checklist_itens
-- já existentes em produção têm `empresa_id = null`, o que quebra qualquer filtro por empresa
-- na auditoria (ETAPA 13 pede rastreabilidade real). Esta migration corrige as duas coisas:
-- não quebra mais (nunca quebrou em produção, mas o arquivo versionado estava desatualizado),
-- e resolve empresa_id via `checklist_id` → `checklists.empresa_id` especificamente para essa
-- tabela, em vez de gravar null. Nenhuma outra tabela muda de comportamento — todas as outras
-- 25 têm empresa_id própria, o `coalesce`/jsonb abaixo é idêntico a `new.empresa_id` pra elas.
-- ============================================================

create or replace function public.fn_audit_log() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_row jsonb;
begin
  v_row := case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_empresa_id := nullif(v_row->>'empresa_id', '')::uuid;

  if v_empresa_id is null and v_row ? 'checklist_id' then
    select c.empresa_id into v_empresa_id from checklists c where c.id = (v_row->>'checklist_id')::uuid;
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
-- 3. Estende fn_validar_transicao_checklist (0007) — mesma state machine, guardas adicionais
--    só quando tipo in ('entrega','devolucao') e o destino é 'concluido'. Nenhum checklist de
--    outro tipo (vistoria_semanal, manutencao, personalizado) ganha exigência nova.
-- ============================================================

create or replace function public.fn_validar_transicao_checklist() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valida boolean;
  v_acao text;
  v_itens_pendentes integer;
  v_itens_sem_foto_reprovados integer;
begin
  -- ETAPA 12 — "uma vistoria nunca deve ser sobrescrita" depois de concluída. Sem isto, a
  -- guarda de status abaixo só bloqueava TROCAR o status de novo — um UPDATE que deixasse
  -- status intacto e alterasse odometro_km/carga_pct/observacoes/etc. passava batido (RLS só
  -- olha empresa+permissão, não status). Escopo só entrega/devolucao — outros tipos de
  -- checklist (manutenção, vistoria semanal, personalizado) continuam editáveis como sempre.
  if TG_OP = 'UPDATE' and old.status = 'concluido' and old.tipo in ('entrega', 'devolucao') then
    raise exception 'Vistoria concluída não pode ser editada — é um registro histórico. Para corrigir, registre uma nova vistoria.';
  end if;

  if TG_OP = 'UPDATE' and old.status is distinct from new.status then
    v_valida := old.status = 'aberto' and new.status in ('concluido','cancelado');

    if not v_valida then
      raise exception 'Transição de status de checklist inválida: % → %', old.status, new.status;
    end if;

    v_acao := case new.status
      when 'concluido' then 'concluir'
      when 'cancelado' then 'cancelar'
      else null
    end;

    if v_acao is not null and not public.pode('operacoes', v_acao) then
      raise exception 'Usuário sem permissão para a ação "%"', v_acao;
    end if;

    -- Guardas de vistoria real (ETAPA 3) — só na conclusão de entrega/devolução.
    if new.status = 'concluido' and new.tipo in ('entrega', 'devolucao') then
      if new.odometro_km is null then
        raise exception 'Vistoria de % exige odômetro registrado', new.tipo;
      end if;
      if new.carga_pct is null then
        raise exception 'Vistoria de % exige carga da bateria registrada', new.tipo;
      end if;
      if new.assinatura_url is null then
        raise exception 'Vistoria de % exige assinatura', new.tipo;
      end if;
      if not new.confirmacao_motorista then
        raise exception 'Vistoria de % exige confirmação do motorista', new.tipo;
      end if;

      select count(*) into v_itens_pendentes
      from checklist_itens i
      where i.checklist_id = new.id and i.obrigatorio and i.aplicavel and i.resposta is null;
      if v_itens_pendentes > 0 then
        raise exception 'Vistoria de % tem % item(ns) obrigatório(s) sem resposta', new.tipo, v_itens_pendentes;
      end if;

      -- Fotos obrigatórias quando há avaria marcada (resposta = false = "Não OK").
      select count(*) into v_itens_sem_foto_reprovados
      from checklist_itens i
      where i.checklist_id = new.id and i.aplicavel and i.resposta = false and i.foto_url is null;
      if v_itens_sem_foto_reprovados > 0 then
        raise exception 'Vistoria de % tem % item(ns) com avaria sem foto', new.tipo, v_itens_sem_foto_reprovados;
      end if;

      if new.tipo = 'devolucao' then
        if new.destino_veiculo is null or new.destino_veiculo not in ('disponivel', 'manutencao') then
          raise exception 'Vistoria de devolução exige destino do veículo (disponível ou manutenção)';
        end if;
        if new.houve_sinistro and new.destino_veiculo <> 'manutencao' then
          raise exception 'Vistoria com sinistro identificado precisa ter destino "manutencao"';
        end if;
      end if;
    end if;

    if new.status = 'concluido' and new.concluido_em is null then
      new.concluido_em := now();
      if new.concluido_por is null then
        new.concluido_por := auth.uid();
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- 4. Vistoria como fonte de verdade (ETAPA 1/10/11) — ao concluir uma vistoria de
--    entrega/devolução ligada a um contrato, É ISSO que ativa/encerra o contrato (reaproveita
--    fn_validar_transicao_contrato/fn_propagar_status_contrato já existentes — nenhuma state
--    machine nova, só um novo disparador pra elas), e decide o destino do veículo na devolução.
-- ============================================================

create or replace function public.fn_propagar_status_vistoria() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_veiculo_id uuid;
begin
  if TG_OP = 'UPDATE' and old.status is distinct from new.status and new.status = 'concluido' then
    if new.tipo = 'entrega' and new.contrato_id is not null then
      update contratos
      set status = 'ativo', km_inicial = new.odometro_km, carga_inicial_pct = new.carga_pct
      where id = new.contrato_id and status = 'assinado';

      if not found then
        raise exception 'Contrato % não está em "assinado" — vistoria de entrega não pode ativá-lo a partir do status atual', new.contrato_id;
      end if;

    elsif new.tipo = 'devolucao' and new.contrato_id is not null then
      update contratos
      set status = 'encerrado', km_final = new.odometro_km, carga_final_pct = new.carga_pct
      where id = new.contrato_id and status = 'ativo';

      if not found then
        raise exception 'Contrato % não está em "ativo" — vistoria de devolução não pode encerrá-lo a partir do status atual', new.contrato_id;
      end if;

      -- trg_contratos_propaga_status (migration 0005) já moveu o veículo alugado→devolvido
      -- dentro do UPDATE acima (trigger AFTER na mesma transação). Aqui só decide o próximo
      -- passo, que a vistoria (não o encerramento em si) é quem sabe responder.
      select veiculo_id into v_veiculo_id from contratos where id = new.contrato_id;
      if v_veiculo_id is not null then
        update veiculos set status = new.destino_veiculo where id = v_veiculo_id and status = 'devolvido';
      end if;

      if new.houve_sinistro then
        insert into sinistros (empresa_id, veiculo_id, motorista_id, contrato_id, tipo, data_ocorrencia, descricao)
        select new.empresa_id, v_veiculo_id, new.motorista_id, new.contrato_id, 'outro', current_date,
               coalesce(new.observacoes, 'Sinistro identificado na vistoria de devolução (checklist ' || new.id || '). Detalhar tipo/valor/seguradora manualmente.')
        where v_veiculo_id is not null;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_checklists_propaga_status on checklists;
create trigger trg_checklists_propaga_status after update on checklists
  for each row execute function public.fn_propagar_status_vistoria();
