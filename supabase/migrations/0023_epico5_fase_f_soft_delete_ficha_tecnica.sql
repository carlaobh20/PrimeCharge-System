-- Épico 5 — "Fleet Intelligence 360", Fase F. Migration 0023.
--
-- Três coisas independentes, todas pequenas, agrupadas numa migration só porque a mesma
-- confirmação de Carlos libera as três de uma vez:
--
-- 1. Soft-delete de veículo (Achado #2 da auditoria do Épico 5: `deleteVeiculo` fazia um
--    `DELETE FROM veiculos` físico, contradizendo a própria regra do brief "nunca perder
--    histórico, mesmo depois de vendido"). Troca o apagar físico por um campo `arquivado_em`.
-- 2. Ficha técnica ampliada do veículo (Seção 1, "Identidade do Ativo", do brief do Épico 5) —
--    campos que hoje não existem: versão, motor, potência, torque, consumo, carga AC/DC,
--    garantia de fábrica.
-- 3. Sinistros — tabela nova. A auditoria da Fase A já tinha achado esse gap: "sinistro" só
--    existia como motivo informal de baixa do veículo inteiro, sem registro estruturado nem
--    atribuição a motorista/contrato específico.
--
-- Nenhuma tabela nova duplica uma existente; nenhuma coluna nova é obrigatória (tudo nullable
-- ou com default seguro) — nada quebra o que já está em produção.

-- ============================================================
-- 1. Soft-delete de veículo
-- ============================================================

alter table veiculos add column if not exists arquivado_em timestamptz;

comment on column veiculos.arquivado_em is
  'Épico 5, Fase F — soft-delete. Null = veículo ativo. Preenchido = arquivado (equivalente ao '
  '"excluído" que a UI mostrava antes, mas sem apagar a linha — contratos, lançamentos e '
  'timeline continuam intactos e consultáveis). O código para de chamar DELETE físico neste '
  'fluxo; a policy de delete físico (pode_excluir_veiculo, migration 0003) continua existindo '
  'só como recurso administrativo manual, fora do fluxo normal do app.';

create index if not exists idx_veiculos_arquivado_em on veiculos(empresa_id, arquivado_em);

-- Nenhuma mudança de RLS necessária aqui: a policy de select já é só por empresa (migration
-- 0003) — o filtro "esconder arquivado por padrão" é responsabilidade da query da aplicação
-- (listVeiculos passa a filtrar arquivado_em is null por padrão, com opção explícita de
-- incluir arquivados para a Seção 9 "Histórico Vitalício" do Épico 5).

-- ============================================================
-- 2. Ficha técnica ampliada
-- ============================================================

alter table veiculos
  add column if not exists versao text,
  add column if not exists motor text,
  add column if not exists potencia_cv numeric(6,1),
  add column if not exists torque_nm numeric(6,1),
  add column if not exists consumo_kwh_100km numeric(5,2),
  add column if not exists carga_ac_kw numeric(5,2),
  add column if not exists carga_dc_kw numeric(6,2),
  add column if not exists garantia_fabrica_meses integer;

comment on column veiculos.versao is 'Épico 5, Fase F — versão/trim comercial do modelo (ex.: "Long Range AWD"). Texto livre, não há tabela de versões por marca/modelo hoje.';
comment on column veiculos.motor is 'Épico 5, Fase F — descrição do motor (ex.: "Motor elétrico duplo, tração integral"). Texto livre.';
comment on column veiculos.potencia_cv is 'Épico 5, Fase F — potência em cv.';
comment on column veiculos.torque_nm is 'Épico 5, Fase F — torque em Nm.';
comment on column veiculos.consumo_kwh_100km is 'Épico 5, Fase F — consumo médio em kWh/100km.';
comment on column veiculos.carga_ac_kw is 'Épico 5, Fase F — potência máxima de carga AC (carregador de tomada/wallbox) em kW.';
comment on column veiculos.carga_dc_kw is 'Épico 5, Fase F — potência máxima de carga DC (carregador rápido) em kW.';
comment on column veiculos.garantia_fabrica_meses is
  'Épico 5, Fase F — duração da garantia de fábrica em meses (ex.: 96 para bateria de 8 anos). '
  'A data de validade é derivada (data_compra + garantia_fabrica_meses) em código, não '
  'guardada duas vezes. ATENÇÃO: não confundir com o campo "Garantia" do Contrato (migration '
  '0021), que é o mecanismo de garantia do aluguel (fiança/caução/seguro-fiança) — mesmo nome '
  'em português, conceitos completamente diferentes.';

-- ============================================================
-- 3. Sinistros — tabela nova
-- ============================================================

do $$ begin
  create type sinistro_tipo as enum ('colisao','roubo','furto','avaria','outro');
exception
  when duplicate_object then null;
end $$;

create table if not exists sinistros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  veiculo_id uuid not null references veiculos(id) on delete cascade,
  motorista_id uuid references motoristas(id) on delete set null,
  contrato_id uuid references contratos(id) on delete set null,
  tipo sinistro_tipo not null,
  data_ocorrencia date not null,
  descricao text not null,
  terceiro_envolvido boolean not null default false,
  valor_prejuizo numeric(12,2),
  valor_franquia numeric(12,2),
  seguradora_acionada boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table sinistros is 'Épico 5, Fase F — registro estruturado de sinistro, atribuível a veículo + opcionalmente motorista/contrato. Fecha o gap documentado na auditoria da Fase A do Épico 4 (Comparativo/Motoristas: "sinistro só existe como motivo de baixa do veículo, não como evento").';

create index if not exists idx_sinistros_empresa on sinistros(empresa_id);
create index if not exists idx_sinistros_veiculo on sinistros(veiculo_id);
create index if not exists idx_sinistros_motorista on sinistros(motorista_id);

alter table sinistros enable row level security;

drop policy if exists "sinistros: select por empresa" on sinistros;
create policy "sinistros: select por empresa" on sinistros
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "sinistros: insert por empresa" on sinistros;
create policy "sinistros: insert por empresa" on sinistros
  for insert with check (empresa_id = public.current_empresa_id());

drop policy if exists "sinistros: update por empresa" on sinistros;
create policy "sinistros: update por empresa" on sinistros
  for update using (empresa_id = public.current_empresa_id());

drop trigger if exists trg_sinistros_atualizado_em on sinistros;
create trigger trg_sinistros_atualizado_em before update on sinistros
  for each row execute function public.fn_set_atualizado_em();

-- Timeline — mesmo padrão de fn_timeline_manutencao/multa (migrations 0010/0012): evento no
-- veículo sempre, e também no motorista quando um motorista estiver identificado no sinistro.
create or replace function public.fn_timeline_sinistro() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
begin
  if TG_OP = 'INSERT' then
    v_descricao := 'Sinistro registrado (' || new.tipo || '): ' || new.descricao;
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'veiculo', new.veiculo_id, 'sinistro_registrado', v_descricao, auth.uid());
    if new.motorista_id is not null then
      insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
      values (new.empresa_id, 'motorista', new.motorista_id, 'sinistro_registrado', v_descricao, auth.uid());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sinistros_timeline on sinistros;
create trigger trg_sinistros_timeline after insert on sinistros
  for each row execute function public.fn_timeline_sinistro();

-- ============================================================
-- 4. Detalhe de venda na Timeline
-- ============================================================
-- Hoje `venderVeiculo` (frota/api/veiculos.ts) atualiza status + comprador + valor_venda +
-- data_venda numa única chamada, mas a trigger genérica (fn_timeline_veiculo) só registrava
-- "Status alterado de X para venda" — os dados reais da venda (já existentes desde a Missão 4,
-- DEC-044) nunca apareciam na Timeline. Ajuste pontual: quando a transição for para 'venda' e
-- vier com comprador preenchido, a descrição inclui comprador/valor/data.
create or replace function public.fn_timeline_veiculo() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descricao text;
begin
  if TG_OP = 'INSERT' then
    v_descricao := 'Veículo cadastrado com status "' || new.status || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'veiculo', new.id, 'criacao', v_descricao, auth.uid());
  elsif TG_OP = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'venda' and new.comprador is not null then
      v_descricao := 'Vendido para ' || new.comprador
        || case when new.valor_venda is not null then ' por R$ ' || new.valor_venda else '' end
        || case when new.data_venda is not null then ' em ' || to_char(new.data_venda::date, 'DD/MM/YYYY') else '' end;
    else
      v_descricao := 'Status alterado de "' || old.status || '" para "' || new.status || '"';
    end if;
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'veiculo', new.id, 'status_alterado', v_descricao, auth.uid());
  end if;
  return new;
end;
$$;
