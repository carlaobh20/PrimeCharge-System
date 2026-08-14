-- Épico 3 — Simulação Empresarial: Cenário + Marcos de Crescimento (2026-08-09).
--
-- Evolução pedida pelo Carlos em cima da primeira versão da Timeline de Crescimento
-- (growthTimeline.ts, migrations 0014/0015): em vez de um simulador só de frota, ele quer um
-- simulador da EMPRESA — onde qualquer evento importante (contratar funcionário, abrir lojinha,
-- comprar wallbox, abrir unidade, criar software, franquear, captar investidor) pode ser
-- disparado por qualquer métrica (veículos, capital disponível, caixa, lucro, ROI, receita,
-- tempo, ou marcação manual).
--
-- Duas tabelas novas, propositalmente separadas:
--
--   1. `cenario_simulacao` — singleton por empresa (mesmo padrão de `politicas_empresa`,
--      migration 0014): os inputs do formulário ("tenho X de capital, pretendo comprar Y
--      veículos..."). Um cenário ativo por vez — múltiplos cenários salvos/comparados fica pra
--      quando existir um 2º/3º pedido real (regra dos 3, já aplicada várias vezes neste
--      projeto), não construído especulativamente agora.
--
--   2. `marcos_crescimento` — N linhas por empresa, uma por evento que o dono cadastra
--      ("Contratar funcionário", "Abrir lojinha"...). `tipo_gatilho` fechado por CHECK (mesmo
--      raciocínio de `linhas_de_negocio_futuras`, migration 0015: vocabulário fechado e
--      validado no banco, não texto livre). `valor_gatilho` é obrigatório pra todo tipo, EXCETO
--      'manual' — marco manual não tem número, o dono marca `concluido_manualmente` com a
--      própria mão quando acontecer (nunca inferido, honestidade DEC-022).
--
-- Owner-gated (eh_owner_da_empresa(), já criada na 0014) — mesma fronteira do resto do Centro
-- de Estratégia.

create table if not exists cenario_simulacao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references empresas(id) on delete cascade,

  capital_disponivel numeric(14,2) not null,
  veiculos_iniciais integer not null default 1,
  valor_entrada_por_veiculo numeric(14,2) not null,
  valor_financiado_por_veiculo numeric(14,2) not null default 0,
  taxa_juros_am_pct numeric(6,3) not null default 0,
  prazo_financiamento_meses integer not null default 0,
  seguro_mensal_por_veiculo numeric(10,2) not null default 0,
  ipva_anual_por_veiculo numeric(10,2) not null default 0,
  aluguel_esperado_mensal_por_veiculo numeric(10,2) not null,
  ocupacao_esperada_pct numeric(5,2) not null,
  inadimplencia_esperada_pct numeric(5,2) not null default 0,
  reinvestir_lucro boolean not null default true,
  objetivo_veiculos integer not null,
  prazo_desejado_meses integer not null,

  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists marcos_crescimento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  nome text not null,
  tipo_gatilho text not null check (tipo_gatilho in ('veiculos','capital_disponivel','caixa','lucro','roi','receita','tempo','manual')),
  valor_gatilho numeric(14,2),
  concluido_manualmente boolean not null default false,
  ativo boolean not null default true,
  ordem integer not null default 0,

  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint chk_marcos_crescimento_valor_gatilho check (
    (tipo_gatilho = 'manual' and valor_gatilho is null) or
    (tipo_gatilho <> 'manual' and valor_gatilho is not null)
  )
);

drop trigger if exists trg_cenario_simulacao_atualizado_em on cenario_simulacao;
create trigger trg_cenario_simulacao_atualizado_em before update on cenario_simulacao
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_cenario_simulacao_audit on cenario_simulacao;
create trigger trg_cenario_simulacao_audit after insert or update or delete on cenario_simulacao
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_marcos_crescimento_atualizado_em on marcos_crescimento;
create trigger trg_marcos_crescimento_atualizado_em before update on marcos_crescimento
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_marcos_crescimento_audit on marcos_crescimento;
create trigger trg_marcos_crescimento_audit after insert or update or delete on marcos_crescimento
  for each row execute function public.fn_audit_log();

alter table cenario_simulacao enable row level security;
alter table marcos_crescimento enable row level security;

drop policy if exists "cenario_simulacao: select por owner" on cenario_simulacao;
create policy "cenario_simulacao: select por owner" on cenario_simulacao
  for select using (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());

drop policy if exists "cenario_simulacao: insert por owner" on cenario_simulacao;
create policy "cenario_simulacao: insert por owner" on cenario_simulacao
  for insert with check (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());

drop policy if exists "cenario_simulacao: update por owner" on cenario_simulacao;
create policy "cenario_simulacao: update por owner" on cenario_simulacao
  for update using (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());

drop policy if exists "marcos_crescimento: select por owner" on marcos_crescimento;
create policy "marcos_crescimento: select por owner" on marcos_crescimento
  for select using (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());

drop policy if exists "marcos_crescimento: insert por owner" on marcos_crescimento;
create policy "marcos_crescimento: insert por owner" on marcos_crescimento
  for insert with check (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());

drop policy if exists "marcos_crescimento: update por owner" on marcos_crescimento;
create policy "marcos_crescimento: update por owner" on marcos_crescimento
  for update using (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());
