-- Épico 2 — Centro de Estratégia, Fase 2: Políticas da Empresa (2026-08-09).
--
-- Ajuste de modelagem pedido explicitamente por Carlos antes de eu rodar isto: não desenhar
-- `politicas_estrategicas` como uma tabela presa ao Centro de Estratégia — pensar como o "DNA"
-- da empresa, que Centro de Operações/IA Operacional/Motor de Recomendações/Automações/
-- Alertas vão querer ler no futuro. Modelagem escolhida (revisada antes de executar, conforme
-- pedido):
--
--   1. Colunas tipadas para as 14 políticas já nomeadas explicitamente no brief (ROI mínimo,
--      payback máximo, caixa mínimo, capital de reserva, alavancagem, financiamento, estoque,
--      marketing, tecnologia, expansão, meta de ocupação/inadimplência/margem/crescimento) —
--      cada uma com nome e tipo específico, permite constraint de banco e consulta direta sem
--      parsing.
--   2. `outras_politicas jsonb` como válvula de escape: uma política nova que ainda não virou
--      coluna entra aqui (`{"chave": valor}`) sem precisar de migration — atende o pedido
--      explícito de "não engessar, permitir adicionar sem nova migration". Quando uma chave em
--      `outras_politicas` for lida por um segundo/terceiro consumidor real, ela "gradua" para
--      coluna tipada própria (mesma migration incremental de sempre) — mesmo raciocínio já
--      registrado em `arquivos.criado_via`/`timeline_eventos.metadata` deste projeto.
--
-- O que este ajuste DELIBERADAMENTE NÃO fez: virar uma tabela EAV pura (`chave text, valor
-- jsonb` sem nenhuma coluna tipada). Alternativa mais "flexível" na aparência, mas perde
-- validação de banco (nada impede `roi_minimo` virar `roi_min` num INSERT futuro, silenciosamente
-- nunca lido por ninguém) e é exatamente o "motor genérico construído antes de ter um segundo
-- consumidor real" que este projeto já rejeitou 5 vezes (DEC-010/011/021/028/054-058,
-- DECISION_LOG.md) — hoje só o Centro de Estratégia lê isto de verdade; Centro de
-- Operações/IA/Automações são consumidores FUTUROS, não reais ainda. O nome da TABELA e o
-- corpo do dado já nascem genéricos (não amarrados a "estratégia"); o CÓDIGO que lê/escreve
-- continua morando em features/estrategia/ até um segundo consumidor real aparecer — mesma
-- fronteira que `metas` (Missão 5) já segue hoje.
--
-- Gate por eh_owner_da_empresa() (novo helper, só owner/super_admin) — replica no banco a
-- mesma fronteira que o Centro de Estratégia já tem no client (Fase 1, RequireOwner.tsx).

create or replace function public.eh_owner_da_empresa() returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from usuarios u
    where u.id = auth.uid() and u.ativo = true and u.role in ('super_admin','owner')
  );
$$;

create table if not exists politicas_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references empresas(id) on delete cascade,

  -- Limites de risco/retorno
  roi_minimo_pct numeric(6,2),
  payback_maximo_meses numeric(6,1),
  caixa_minimo_meses numeric(6,1),
  capital_reserva_valor numeric(14,2),
  alavancagem_maxima_pct numeric(6,2),
  financiamento_maximo_pct numeric(6,2),

  -- Limites de alocação por categoria de investimento
  estoque_maximo_pct numeric(6,2),
  marketing_maximo_pct numeric(6,2),
  tecnologia_maximo_pct numeric(6,2),
  expansao_maximo_pct numeric(6,2),

  -- Metas operacionais/financeiras
  meta_ocupacao_pct numeric(6,2),
  meta_inadimplencia_maxima_pct numeric(6,2),
  meta_margem_liquida_pct numeric(6,2),
  meta_crescimento_anual_pct numeric(6,2),

  -- Válvula de escape genérica — ver comentário acima. Convenção: chave em snake_case,
  -- valor sempre numeric (mesmo formato das colunas tipadas) — quem ler documenta a chave
  -- que usa no próprio arquivo de consumo (mesmo padrão de `metadata` em timeline_eventos).
  outras_politicas jsonb not null default '{}'::jsonb,

  atualizado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

drop trigger if exists trg_politicas_empresa_atualizado_em on politicas_empresa;
create trigger trg_politicas_empresa_atualizado_em before update on politicas_empresa
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_politicas_empresa_audit on politicas_empresa;
create trigger trg_politicas_empresa_audit after insert or update or delete on politicas_empresa
  for each row execute function public.fn_audit_log();

alter table politicas_empresa enable row level security;

drop policy if exists "politicas_empresa: select por owner" on politicas_empresa;
create policy "politicas_empresa: select por owner" on politicas_empresa
  for select using (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());

drop policy if exists "politicas_empresa: insert por owner" on politicas_empresa;
create policy "politicas_empresa: insert por owner" on politicas_empresa
  for insert with check (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());

drop policy if exists "politicas_empresa: update por owner" on politicas_empresa;
create policy "politicas_empresa: update por owner" on politicas_empresa
  for update using (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());
