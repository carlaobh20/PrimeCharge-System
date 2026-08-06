-- PrimeCharge OS — Missão 4 (Operação Real, Zero → Primeiro Carro), 2026-08-06.
-- Referência: DECISION_LOG.md DEC-098 em diante.
--
-- Escopo desta migration — fecha buracos reais encontrados na Fase 1 (auditoria completa
-- da jornada operacional: compra → cadastro → documentação → motorista → contrato →
-- entrega → checklist → vistoria → pagamento → uso → alertas → multas → manutenções →
-- renovações → financeiro → devolução → venda → encerramento):
--
-- 1. `multas` — tabela nova. Único ponto real da jornada sem NENHUMA infraestrutura (nem
--    campo, nem tela, nem placeholder honesto de dado) — diferente de Battery Intelligence/
--    Marketplace (DEC-090/092), que foram avaliados e recusados conscientemente, "multa"
--    nunca recebeu essa avaliação: era um placeholder herdado da Sprint 6 (DEC-025) nunca
--    revisitado. Vinculada a `veiculos` (é onde a infração chega, por placa) e opcionalmente
--    a `motoristas` (quem estava dirigindo pode ser desconhecido/definido depois).
-- 2. `manutencoes` ganha `data_agendada` + `status_execucao` — hoje só registra manutenção
--    que JÁ aconteceu (`data_execucao` obrigatória); não existe "manutenção pendente" como
--    estado possível, o que torna a Fase 3 desta missão (pedido explícito de "manutenções
--    pendentes" no painel operacional) impossível de atender mesmo em tese sem esta mudança.
-- 3. `manutencoes` ganha geração automática de `lancamentos` quando tem custo — fecha
--    DEC-079 (dívida conhecida desde a Missão 2), agora dentro do escopo desta missão porque
--    o mandato explícito é "nenhuma funcionalidade pode depender de lançar o mesmo dado duas
--    vezes manualmente".
-- 4. `veiculos` ganha campos reais de venda (`comprador`, `valor_venda`, `data_venda`) — hoje
--    "Vender veículo" é só uma transição de status sem nenhum dado da venda em si (achado
--    registrado como pendência consciente em DEC-044, agora fechado).

-- ============================================================
-- 1. Multas
-- ============================================================

do $$ begin
  create type multa_status as enum ('pendente','paga','recorrida','cancelada');
exception
  when duplicate_object then null;
end $$;

create table if not exists multas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  veiculo_id uuid not null references veiculos(id) on delete restrict,
  motorista_id uuid references motoristas(id) on delete set null,
  contrato_id uuid references contratos(id) on delete set null,

  orgao_autuador text not null,
  descricao text not null,
  data_infracao date not null,
  data_vencimento date,
  valor numeric(12,2),
  pontos smallint,
  status multa_status not null default 'pendente',

  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint chk_multas_valor check (valor is null or valor >= 0),
  constraint chk_multas_pontos check (pontos is null or pontos >= 0)
);

-- veiculo_id é RESTRICT, não CASCADE (mesma correção de manutencoes na migration 0011) —
-- multa é histórico de infração real, não deve desaparecer se o veículo for excluído.
create index if not exists idx_multas_empresa on multas(empresa_id);
create index if not exists idx_multas_veiculo on multas(veiculo_id, data_infracao desc);
create index if not exists idx_multas_motorista on multas(motorista_id, data_infracao desc);
create index if not exists idx_multas_status on multas(empresa_id, status);

drop trigger if exists trg_multas_atualizado_em on multas;
create trigger trg_multas_atualizado_em before update on multas
  for each row execute function public.fn_set_atualizado_em();

alter table multas enable row level security;

-- Reaproveita o módulo de permissão 'veiculos' (mesmo padrão de `manutencoes`, migration
-- 0010 — a infração pertence à placa, não justifica um módulo de permissão novo, Regra dos 3).
drop policy if exists "multas: select por empresa" on multas;
create policy "multas: select por empresa" on multas
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "multas: insert por permissao" on multas;
create policy "multas: insert por permissao" on multas
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('veiculos','criar'));

drop policy if exists "multas: update por permissao" on multas;
create policy "multas: update por permissao" on multas
  for update using (empresa_id = public.current_empresa_id() and public.pode('veiculos','editar'));

drop policy if exists "multas: delete por permissao" on multas;
create policy "multas: delete por permissao" on multas
  for delete using (empresa_id = public.current_empresa_id() and public.pode('veiculos','excluir'));

-- Timeline — mesmo padrão de fn_timeline_manutencao (0010). Gera evento no veículo sempre;
-- se motorista já identificado no momento do registro, gera também no motorista (infração
-- só tem um `entidade_tipo`/`entidade_id` por linha de timeline_eventos).
create or replace function public.fn_timeline_multa() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
begin
  if TG_OP = 'INSERT' then
    v_descricao := 'Multa registrada (' || new.orgao_autuador || '): ' || new.descricao;
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'veiculo', new.veiculo_id, 'multa_registrada', v_descricao, auth.uid());
    if new.motorista_id is not null then
      insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
      values (new.empresa_id, 'motorista', new.motorista_id, 'multa_registrada', v_descricao, auth.uid());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_multas_timeline on multas;
create trigger trg_multas_timeline after insert on multas
  for each row execute function public.fn_timeline_multa();

-- ============================================================
-- 2. Manutenção agendada — fecha o buraco de "manutenção pendente" não existir nem em tese
-- ============================================================

do $$ begin
  create type manutencao_status_execucao as enum ('agendada','realizada','cancelada');
exception
  when duplicate_object then null;
end $$;

alter table manutencoes add column if not exists data_agendada date;
alter table manutencoes add column if not exists status_execucao manutencao_status_execucao not null default 'realizada';

-- data_execucao passa a ser opcional — só é preenchida quando a manutenção de fato
-- aconteceu (status_execucao = 'realizada'). Linhas existentes (todas 'realizada' por
-- default acima) mantêm data_execucao obrigatória de fato porque já foram criadas assim;
-- o constraint abaixo só exige a regra dali pra frente.
alter table manutencoes alter column data_execucao drop not null;

alter table manutencoes drop constraint if exists chk_manutencoes_execucao_coerente;
alter table manutencoes add constraint chk_manutencoes_execucao_coerente check (
  (status_execucao = 'realizada' and data_execucao is not null)
  or (status_execucao in ('agendada','cancelada'))
);

create index if not exists idx_manutencoes_agendada on manutencoes(empresa_id, data_agendada) where status_execucao = 'agendada';

-- ============================================================
-- 3. Manutenção → Lançamento automático (fecha DEC-079)
-- ============================================================

alter table lancamentos add column if not exists manutencao_id uuid references manutencoes(id) on delete set null;
create index if not exists idx_lancamentos_manutencao on lancamentos(manutencao_id);

create or replace function public.fn_manutencao_gera_lancamento() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Só gera Lançamento quando a manutenção tem custo e está (ou passou a estar) realizada —
  -- manutenção agendada sem custo definido ainda não é despesa confirmada. Idempotente: só
  -- insere se ainda não existe um lancamento apontando pra esta manutencao_id (evita duplicar
  -- em updates repetidos).
  if new.status_execucao = 'realizada' and new.custo is not null and new.custo > 0 then
    if not exists (select 1 from lancamentos where manutencao_id = new.id) then
      insert into lancamentos (
        empresa_id, tipo, status, descricao, valor, categoria,
        veiculo_id, data_prevista, data_confirmacao, criado_via, manutencao_id, observacoes
      ) values (
        new.empresa_id, 'despesa', 'confirmada',
        'Manutenção: ' || new.descricao,
        new.custo, 'manutencao',
        new.veiculo_id, new.data_execucao, new.data_execucao,
        'automacao', new.id,
        'Gerado automaticamente ao registrar a manutenção — Missão 4 (fecha DEC-079).'
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_manutencoes_gera_lancamento on manutencoes;
create trigger trg_manutencoes_gera_lancamento after insert or update on manutencoes
  for each row execute function public.fn_manutencao_gera_lancamento();

-- ============================================================
-- 4. Venda real do veículo (fecha DEC-044)
-- ============================================================

alter table veiculos add column if not exists comprador text;
alter table veiculos add column if not exists valor_venda numeric(12,2);
alter table veiculos add column if not exists data_venda date;

alter table veiculos drop constraint if exists chk_veiculos_valor_venda;
alter table veiculos add constraint chk_veiculos_valor_venda check (valor_venda is null or valor_venda >= 0);
