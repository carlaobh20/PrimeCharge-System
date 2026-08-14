-- Épico 8 — Migration 0031 — HOTFIX: cria a tabela `sinistros`.
--
-- ACHADO CRÍTICO durante o teste transacional (BEGIN...ROLLBACK) da migration 0030 direto em
-- produção: fn_propagar_status_vistoria() (0030) insere em `sinistros` quando uma vistoria de
-- devolução é concluída com houve_sinistro=true, assumindo que essa tabela já existia — premissa
-- herdada dos relatórios do Épico 5 ("tabela já existente"). Ela NÃO existe em produção, e não
-- existe NENHUMA migration neste repositório que a crie (grep confirmado em todo supabase/migrations).
-- Ou seja: o que o Épico 5 reportou como entregue nunca foi de fato aplicado ao banco.
--
-- Sem esta migration, a 0030 (já aplicada em produção antes desta) quebra com
-- "relation sinistros does not exist" na primeira vez que alguém concluir uma devolução com
-- sinistro marcado — confirmado ao vivo durante o teste transacional desta sessão.
--
-- Escopo desta migration: o MÍNIMO que fn_propagar_status_vistoria() precisa pra não quebrar —
-- sem workflow de valor/seguradora/status/anexos. Isso fica para um Épico dedicado a sinistros,
-- que ainda precisa ser desenhado (não inferível da arquitetura existente — decisão de negócio).

create table if not exists sinistros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  veiculo_id uuid references veiculos(id) on delete set null,
  motorista_id uuid references motoristas(id) on delete set null,
  contrato_id uuid references contratos(id) on delete set null,
  tipo text not null default 'outro',
  data_ocorrencia date not null default current_date,
  descricao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
comment on table sinistros is 'Migration 0031 (hotfix Épico 8) — registro mínimo de sinistro, criado automaticamente pela vistoria de devolução quando houve_sinistro=true (fn_propagar_status_vistoria, migration 0030). Sem workflow de valor/seguradora/status ainda — fica para um Épico dedicado a sinistros.';
comment on column sinistros.tipo is 'Texto livre por enquanto (ex.: outro). Sem enum dedicado até existir um Épico de sinistros com os tipos reais do negócio.';
comment on column sinistros.descricao is 'Preenchido automaticamente pela vistoria de devolução com referência ao checklist de origem; detalhamento manual (valor, seguradora, etc.) fica para follow-up humano.';

create index if not exists idx_sinistros_empresa on sinistros(empresa_id);
create index if not exists idx_sinistros_veiculo on sinistros(veiculo_id) where veiculo_id is not null;
create index if not exists idx_sinistros_contrato on sinistros(contrato_id) where contrato_id is not null;

alter table sinistros enable row level security;

drop policy if exists "sinistros: select por empresa" on sinistros;
create policy "sinistros: select por empresa" on sinistros
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "sinistros: insert por empresa" on sinistros;
create policy "sinistros: insert por empresa" on sinistros
  for insert with check (empresa_id = public.current_empresa_id() and public.pode('operacoes','criar'));

drop policy if exists "sinistros: update por empresa" on sinistros;
create policy "sinistros: update por empresa" on sinistros
  for update using (empresa_id = public.current_empresa_id() and public.pode('operacoes','editar'));

drop trigger if exists trg_sinistros_atualizado_em on sinistros;
create trigger trg_sinistros_atualizado_em before update on sinistros
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_sinistros_audit on sinistros;
create trigger trg_sinistros_audit after insert or update or delete on sinistros
  for each row execute function public.fn_audit_log();
