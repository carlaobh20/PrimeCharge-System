-- Épico 6 — CRM PrimeCharge, Fase 1.1. Migration 0026.
--
-- Pedido do Carlos, testando o Kanban ao vivo: "quero conseguir editar o kanban, adicionar ou
-- excluir uma fase". A migration 0025 criou as 14 etapas como um ENUM Postgres fixo
-- (motorista_etapa_funil) — enum não é editável em runtime pela aplicação, só por quem tem
-- acesso ao banco (eu, via SQL). Pra Carlos poder adicionar/remover fase sozinho pela tela, o
-- funil precisa ser DADO (uma tabela), não um TIPO.
--
-- Decisão de arquitetura: nova tabela `funil_etapas`, por empresa, substitui o enum como fonte
-- de verdade das colunas do Kanban. Coluna nova `motoristas.etapa_funil_id` (FK) convive com a
-- antiga `motoristas.etapa_funil` (enum, migration 0025) — a antiga NÃO é apagada (nunca
-- dropamos coluna neste projeto) nem mais usada pelo app a partir desta migration; fica como
-- histórico morto, documentado abaixo.
--
-- Cada etapa agora carrega um `grupo` (lead/em_analise/aprovado/fila/ativo/encerrado/nenhum) —
-- é isso que permite o painel de métricas (Leads/Em análise/Aprovados/Fila/Ativos/Conversão)
-- continuar funcionando mesmo que Carlos renomeie ou crie etapas novas: a métrica olha o GRUPO
-- da etapa, não o nome literal dela. Etapa nova criada pelo Carlos entra com grupo 'nenhum' por
-- padrão (não conta em nenhuma métrica agregada até ele escolher um grupo pra ela na tela).
--
-- Exclusão de etapa é sempre soft (`ativa = false`) — nunca DELETE físico. Bloqueada em código
-- (não em trigger) enquanto houver motorista não-arquivado naquela etapa: força mover as
-- pessoas antes de remover a coluna, em vez de perder a referência delas silenciosamente.

-- ============================================================
-- 1. Soft-delete de motorista — pedido junto ("excluir o motorista")
-- ============================================================
-- Achado ao investigar o pedido: já existe um fluxo de exclusão físico (DELETE, migration
-- 0004, pode_excluir_motorista/deleteMotorista), só não tinha um botão acessível a partir do
-- Kanban/painel lateral novo — só da tela cheia antiga (/motoristas/:id). Reaproveitado como
-- está (já é gated por role via RLS, e `contratos.motorista_id` é `on delete restrict`, então
-- motorista com contrato já não pode ser excluído fisicamente hoje) — nenhuma coluna nova
-- necessária pra isso. Este bloco 1 documenta a decisão de NÃO duplicar em soft-delete agora;
-- ver relatório entregue a Carlos para o raciocínio completo.

-- ============================================================
-- 2. funil_etapas — tabela nova
-- ============================================================

do $$ begin
  create type funil_etapa_grupo as enum ('lead','em_analise','aprovado','fila','ativo','encerrado','nenhum');
exception
  when duplicate_object then null;
end $$;

create table if not exists funil_etapas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  grupo funil_etapa_grupo not null default 'nenhum',
  ordem integer not null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint uq_funil_etapas_empresa_nome unique (empresa_id, nome)
);

comment on table funil_etapas is
  'Épico 6, Fase 1.1 — colunas do Kanban de CRM, editáveis por empresa (substitui o enum fixo '
  'motorista_etapa_funil da migration 0025, que fica intocado como histórico morto).';
comment on column funil_etapas.grupo is
  'Bucket semântico usado pelo painel de métricas do Kanban (Leads/Em análise/Aprovados/Fila/'
  'Ativos/Conversão) — permite que Carlos renomeie/crie/remova etapas sem quebrar as métricas '
  'agregadas, que olham o grupo, não o nome literal da etapa. Etapa nova criada pela tela entra '
  'com "nenhum" (não conta em métrica nenhuma) até alguém escolher um grupo pra ela.';
comment on column funil_etapas.ativa is
  'Soft-delete (DEC-022) — nunca DELETE físico de etapa. A aplicação bloqueia desativar uma '
  'etapa que ainda tenha motorista não-arquivado nela (força mover as pessoas antes).';

create index if not exists idx_funil_etapas_empresa on funil_etapas(empresa_id, ordem);

-- Seed: as mesmas 14 etapas da migration 0025, agora como linhas, uma vez por empresa
-- existente. Empresa criada depois desta migration não ganha seed automático — decisão
-- deliberada (só faz sentido semear pra quem já estava operando o Kanban; empresa nova é
-- Fase 2+, sem usuário real ainda).
insert into funil_etapas (empresa_id, nome, grupo, ordem)
select e.id, v.nome, v.grupo::funil_etapa_grupo, v.ordem
from empresas e
cross join (values
  ('Novo Lead', 'lead', 1),
  ('Primeiro Contato', 'lead', 2),
  ('Interessado', 'lead', 3),
  ('Documentação', 'em_analise', 4),
  ('Análise Financeira', 'em_analise', 5),
  ('Análise Jurídica', 'em_analise', 6),
  ('Entrevista', 'em_analise', 7),
  ('Aprovado', 'aprovado', 8),
  ('Aguardando Veículo', 'fila', 9),
  ('Contrato Assinado', 'ativo', 10),
  ('Entrega do Veículo', 'ativo', 11),
  ('Motorista Ativo', 'ativo', 12),
  ('Fidelização', 'ativo', 13),
  ('Encerrado', 'encerrado', 14)
) as v(nome, grupo, ordem)
on conflict (empresa_id, nome) do nothing;

-- ============================================================
-- 3. motoristas.etapa_funil_id — nova FK, substitui o enum no app
-- ============================================================

alter table motoristas add column if not exists etapa_funil_id uuid references funil_etapas(id) on delete set null;

comment on column motoristas.etapa_funil_id is
  'Épico 6, Fase 1.1 — substitui motoristas.etapa_funil (enum, migration 0025) como coluna '
  'ativa do Kanban. A coluna antiga fica no banco (nunca dropamos coluna), mas o app para de '
  'ler/escrever nela a partir desta migration.';

create index if not exists idx_motoristas_etapa_funil_id on motoristas(empresa_id, etapa_funil_id);

-- Backfill: liga quem já tinha etapa_funil (enum) preenchida à linha correspondente da nova
-- tabela, casando pelo nome. Na prática, hoje (10/08), nenhum motorista real do Carlos tinha
-- sido classificado ainda (o drag-and-drop só passou a funcionar nesta mesma sessão) — mas o
-- backfill precisa existir e estar correto de qualquer forma, pra qualquer empresa/momento.
update motoristas m
set etapa_funil_id = fe.id
from funil_etapas fe
where fe.empresa_id = m.empresa_id
  and m.etapa_funil is not null
  and m.etapa_funil_id is null
  and fe.nome = case m.etapa_funil::text
    when 'novo_lead' then 'Novo Lead'
    when 'primeiro_contato' then 'Primeiro Contato'
    when 'interessado' then 'Interessado'
    when 'documentacao' then 'Documentação'
    when 'analise_financeira' then 'Análise Financeira'
    when 'analise_juridica' then 'Análise Jurídica'
    when 'entrevista' then 'Entrevista'
    when 'aprovado' then 'Aprovado'
    when 'aguardando_veiculo' then 'Aguardando Veículo'
    when 'contrato_assinado' then 'Contrato Assinado'
    when 'entrega_veiculo' then 'Entrega do Veículo'
    when 'motorista_ativo' then 'Motorista Ativo'
    when 'fidelizacao' then 'Fidelização'
    when 'encerrado' then 'Encerrado'
  end;

-- ============================================================
-- 4. RLS — funil_etapas segue o mesmo padrão de centros_custo (migration 0006): select livre
-- por empresa, insert/update gated por permissão dedicada.
-- ============================================================

alter table funil_etapas enable row level security;

drop policy if exists "funil_etapas: select por empresa" on funil_etapas;
create policy "funil_etapas: select por empresa" on funil_etapas
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "funil_etapas: insert por empresa" on funil_etapas;
create policy "funil_etapas: insert por empresa" on funil_etapas
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('motoristas', 'gerenciar_funil'));

drop policy if exists "funil_etapas: update por empresa" on funil_etapas;
create policy "funil_etapas: update por empresa" on funil_etapas
  for update using (empresa_id = public.current_empresa_id() and public.pode('motoristas', 'gerenciar_funil'));

insert into permissoes (role, modulo, acao, permitido)
select role::user_role, 'motoristas', 'gerenciar_funil', true
from (values ('super_admin'), ('owner'), ('admin'), ('gestor_frota')) as r(role)
on conflict (role, modulo, acao) do nothing;

-- ============================================================
-- 5. Trigger de etapa_funil_desde + Timeline — reescrita pra ler etapa_funil_id em vez do
-- enum antigo (mesma função/trigger da migration 0025, só troca a coluna observada).
-- ============================================================

create or replace function public.fn_motorista_etapa_funil() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_antigo text;
  v_nome_novo text;
  v_descricao text;
begin
  if TG_OP = 'UPDATE' and old.etapa_funil_id is distinct from new.etapa_funil_id then
    new.etapa_funil_desde := now();

    select nome into v_nome_antigo from funil_etapas where id = old.etapa_funil_id;
    select nome into v_nome_novo from funil_etapas where id = new.etapa_funil_id;

    v_descricao := 'Etapa do funil alterada de "' || coalesce(v_nome_antigo, 'não classificado')
      || '" para "' || coalesce(v_nome_novo, 'não classificado') || '"';
    insert into timeline_eventos (empresa_id, entidade_tipo, entidade_id, tipo, descricao, usuario_id)
    values (new.empresa_id, 'motorista', new.id, 'etapa_funil_alterada', v_descricao, auth.uid());
  end if;
  return new;
end;
$$;

-- trg_motoristas_etapa_funil (migration 0025) já existe e já chama esta função — create or
-- replace acima é suficiente, o trigger não precisa ser recriado.
