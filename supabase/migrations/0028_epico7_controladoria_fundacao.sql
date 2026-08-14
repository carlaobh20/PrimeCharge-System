-- Épico 7 — Controladoria PrimeCharge, Sprint 1 (Fundação da Inteligência Financeira).
--
-- Contexto: hoje o sistema tem um livro-razão de 2 níveis (lancamentos + pagamentos, migration
-- 0006) sem nenhuma camada contábil — lancamentos.categoria é texto livre e o próprio código
-- já documentava que isso é pouco confiável pra agregação. Esta migration constrói só a
-- FUNDAÇÃO: Plano de Contas, Centro de Resultado, motor de classificação automática (regra
-- determinística, não IA) e as colunas de rastreabilidade que faltavam.
-- Fora de escopo (Sprint 2+): DRE, Fluxo de Caixa, Balanço, Orçamento, Fechamento Mensal,
-- qualquer tela nova. Nenhuma coluna nova é obrigatória — lançamento existente continua
-- válido, nada é classificado retroativamente por adivinhação.

-- 1. Enum do Plano de Contas
do $$ begin
  create type plano_conta_grupo as enum ('receita','custo','despesa','financeiro','investimento','patrimonio');
exception
  when duplicate_object then null;
end $$;

-- 2. Plano de Contas
create table if not exists plano_contas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  parent_id uuid references plano_contas(id) on delete set null,
  nome text not null,
  grupo plano_conta_grupo not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, nome)
);

create index if not exists idx_plano_contas_empresa on plano_contas(empresa_id);
create index if not exists idx_plano_contas_parent on plano_contas(parent_id);

alter table plano_contas enable row level security;

drop policy if exists plano_contas_select on plano_contas;
create policy plano_contas_select on plano_contas for select
  using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

drop policy if exists plano_contas_insert on plano_contas;
create policy plano_contas_insert on plano_contas for insert
  with check (empresa_id = (select empresa_id from usuarios where id = auth.uid()) and pode('financeiro', 'gerenciar_plano_contas'));

drop policy if exists plano_contas_update on plano_contas;
create policy plano_contas_update on plano_contas for update
  using (empresa_id = (select empresa_id from usuarios where id = auth.uid()))
  with check (empresa_id = (select empresa_id from usuarios where id = auth.uid()) and pode('financeiro', 'gerenciar_plano_contas'));

create or replace function fn_plano_contas_atualizado_em() returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end;
$$;

drop trigger if exists trg_plano_contas_atualizado_em on plano_contas;
create trigger trg_plano_contas_atualizado_em before update on plano_contas
  for each row execute function fn_plano_contas_atualizado_em();

drop trigger if exists trg_plano_contas_audit on plano_contas;
create trigger trg_plano_contas_audit after insert or update or delete on plano_contas
  for each row execute function public.fn_audit_log();

-- 3. Centro de Resultado (distinto de centros_custo, migration 0006 — aquele nunca decolou e
-- não é consumido por nenhum cálculo; este é a unidade de agrupamento de RECEITA/resultado,
-- não de custo operacional).
create table if not exists centros_resultado (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, nome)
);

create index if not exists idx_centros_resultado_empresa on centros_resultado(empresa_id);

alter table centros_resultado enable row level security;

drop policy if exists centros_resultado_select on centros_resultado;
create policy centros_resultado_select on centros_resultado for select
  using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

drop policy if exists centros_resultado_insert on centros_resultado;
create policy centros_resultado_insert on centros_resultado for insert
  with check (empresa_id = (select empresa_id from usuarios where id = auth.uid()) and pode('financeiro', 'gerenciar_centros_resultado'));

drop policy if exists centros_resultado_update on centros_resultado;
create policy centros_resultado_update on centros_resultado for update
  using (empresa_id = (select empresa_id from usuarios where id = auth.uid()))
  with check (empresa_id = (select empresa_id from usuarios where id = auth.uid()) and pode('financeiro', 'gerenciar_centros_resultado'));

create or replace function fn_centros_resultado_atualizado_em() returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end;
$$;

drop trigger if exists trg_centros_resultado_atualizado_em on centros_resultado;
create trigger trg_centros_resultado_atualizado_em before update on centros_resultado
  for each row execute function fn_centros_resultado_atualizado_em();

drop trigger if exists trg_centros_resultado_audit on centros_resultado;
create trigger trg_centros_resultado_audit after insert or update or delete on centros_resultado
  for each row execute function public.fn_audit_log();

-- 4. Regras de classificação — motor determinístico (substring, não IA). Nasce vazia: nenhuma
-- regra especulativa. Se nenhuma regra casar, o lançamento fica sem classificação — nunca
-- adivinha.
create table if not exists regras_classificacao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  padrao_texto text not null,
  conta_contabil_id uuid references plano_contas(id) on delete cascade,
  centro_resultado_id uuid references centros_resultado(id) on delete cascade,
  centro_custo_id uuid references centros_custo(id) on delete cascade,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, padrao_texto),
  constraint chk_regras_classificacao_tem_alvo check (
    conta_contabil_id is not null or centro_resultado_id is not null or centro_custo_id is not null
  )
);

create index if not exists idx_regras_classificacao_empresa on regras_classificacao(empresa_id) where ativo;

alter table regras_classificacao enable row level security;

drop policy if exists regras_classificacao_select on regras_classificacao;
create policy regras_classificacao_select on regras_classificacao for select
  using (empresa_id = (select empresa_id from usuarios where id = auth.uid()));

drop policy if exists regras_classificacao_insert on regras_classificacao;
create policy regras_classificacao_insert on regras_classificacao for insert
  with check (empresa_id = (select empresa_id from usuarios where id = auth.uid()) and pode('financeiro', 'gerenciar_plano_contas'));

drop policy if exists regras_classificacao_update on regras_classificacao;
create policy regras_classificacao_update on regras_classificacao for update
  using (empresa_id = (select empresa_id from usuarios where id = auth.uid()))
  with check (empresa_id = (select empresa_id from usuarios where id = auth.uid()) and pode('financeiro', 'gerenciar_plano_contas'));

create or replace function fn_regras_classificacao_atualizado_em() returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end;
$$;

drop trigger if exists trg_regras_classificacao_atualizado_em on regras_classificacao;
create trigger trg_regras_classificacao_atualizado_em before update on regras_classificacao
  for each row execute function fn_regras_classificacao_atualizado_em();

drop trigger if exists trg_regras_classificacao_audit on regras_classificacao;
create trigger trg_regras_classificacao_audit after insert or update or delete on regras_classificacao
  for each row execute function public.fn_audit_log();

-- 5. Colunas de rastreabilidade em lancamentos e pagamentos. categoria (texto livre) continua
-- existindo — conta_contabil_id é um campo PARALELO estruturado, não substitui categoria nesta
-- fase (migração de dados existentes fica pra quando houver tela de reclassificação em lote).
alter table lancamentos
  add column if not exists conta_contabil_id uuid references plano_contas(id) on delete set null,
  add column if not exists centro_resultado_id uuid references centros_resultado(id) on delete set null,
  add column if not exists competencia date,
  add column if not exists usuario_id uuid references usuarios(id) on delete set null;

comment on column lancamentos.conta_contabil_id is 'Classificação estruturada (Épico 7). Paralela a categoria (texto livre) — não a substitui nesta fase.';

alter table pagamentos
  add column if not exists usuario_id uuid references usuarios(id) on delete set null;

update lancamentos set competencia = date_trunc('month', data_prevista)::date where competencia is null;

-- 6. Motor de classificação automática. BEFORE INSERT: só preenche campos que estejam NULL
-- (nunca sobrescreve classificação manual), casa regra ativa por substring (ILIKE) contra
-- categoria OU descricao, usa a primeira regra que casar. Sem regra casando, não classifica —
-- nunca chuta.
create or replace function fn_classificar_lancamento_automaticamente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_regra regras_classificacao%rowtype;
begin
  if new.competencia is null then
    new.competencia := date_trunc('month', new.data_prevista)::date;
  end if;

  if new.conta_contabil_id is null and new.centro_resultado_id is null then
    select r.* into v_regra
    from regras_classificacao r
    where r.empresa_id = new.empresa_id
      and r.ativo
      and (
        (new.categoria is not null and new.categoria ilike '%' || r.padrao_texto || '%')
        or new.descricao ilike '%' || r.padrao_texto || '%'
      )
    order by r.criado_em
    limit 1;

    if found then
      if new.conta_contabil_id is null then
        new.conta_contabil_id := v_regra.conta_contabil_id;
      end if;
      if new.centro_resultado_id is null then
        new.centro_resultado_id := v_regra.centro_resultado_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_lancamentos_classificacao_automatica on lancamentos;
create trigger trg_lancamentos_classificacao_automatica
  before insert on lancamentos
  for each row execute function fn_classificar_lancamento_automaticamente();

-- 7. Permissões novas no módulo financeiro (matriz `pode()` — role/modulo/acao, mesmo padrão
-- de gerenciar_contas/gerenciar_centros_custo na migration 0006).
insert into permissoes (role, modulo, acao, permitido)
select role::user_role, 'financeiro', acao, true
from (values ('super_admin'), ('owner'), ('admin')) as r(role)
cross join (values ('gerenciar_plano_contas'), ('gerenciar_centros_resultado')) as a(acao)
on conflict (role, modulo, acao) do nothing;

insert into permissoes (role, modulo, acao, permitido) values
  ('gestor_financeiro', 'financeiro', 'gerenciar_plano_contas', true),
  ('gestor_financeiro', 'financeiro', 'gerenciar_centros_resultado', true)
on conflict (role, modulo, acao) do nothing;

-- 8. Seed — apenas estrutura raiz real (6 grupos contábeis padrão) e o único centro de
-- resultado que já existe de fato hoje (Locação). Nada especulativo.
insert into plano_contas (empresa_id, nome, grupo)
select e.id, v.nome, v.grupo::plano_conta_grupo
from empresas e
cross join (values
  ('Receitas', 'receita'),
  ('Custos', 'custo'),
  ('Despesas', 'despesa'),
  ('Financeiro', 'financeiro'),
  ('Investimentos', 'investimento'),
  ('Patrimônio', 'patrimonio')
) as v(nome, grupo)
on conflict (empresa_id, nome) do nothing;

insert into centros_resultado (empresa_id, nome)
select id, 'Locação' from empresas
on conflict (empresa_id, nome) do nothing;
