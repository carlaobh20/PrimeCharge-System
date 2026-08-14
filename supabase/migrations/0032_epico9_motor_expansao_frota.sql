-- Épico 9 — Motor de Expansão e Alocação de Capital, Fase 1. Migration 0032.
--
-- Auditoria pré-implementação (relatório completo entregue ao Carlos fora deste arquivo):
-- Caixa real (calcularSaldoPorConta, financeiro/intelligence), Dívida/Equity reais por veículo
-- (financiamentoReal.ts + valorAtivo.ts, frota/intelligence), Capital investido/ROI da frota
-- (calcularCapitalAlocado, estrategia/intelligence) e a matemática de amortização
-- (gerarTabelaAmortizacao/calcularParcelaPrice, shared/lib/amortizacao.ts) JÁ EXISTEM e são
-- reaproveitados sem alteração — nenhum desses cálculos é duplicado aqui. `veiculos` já tem
-- comprador/valor_venda/data_venda (migration 0003) — reaproveitados para "capital reciclável".
--
-- O que NÃO existe e esta migration cria: uma tabela pra persistir as PREMISSAS de um cenário
-- de expansão (preço do próximo veículo, financiamento, receita/custo por veículo, reserva
-- mínima, horizonte, venda programada) — deliberadamente distinta de `cenario_simulacao`
-- (migration 0016/0017), que é um cenário HIPOTÉTICO independente da frota real. Aqui o motor
-- SEMPRE parte do estado real (caixa/dívida/equity/frota calculados ao vivo, nunca
-- persistidos — mesmo princípio de "nunca guardar número que fica velho" já usado em
-- calcularSaldoPorConta) e simula a partir dele. Reaproveitar `cenario_simulacao` forçaria um
-- meio-termo ruim: ou ele passa a exigir um "capital_disponivel" digitado à mão (quebrando os
-- cenários hipotéticos existentes que hoje são propositalmente independentes da frota real),
-- ou o motor de expansão finge que carrega dado real através de uma tabela que hoje é 100%
-- hipotética. As duas opções violam DEC-022 (honestidade de dado).
--
-- As 3 estratégias (Conservadora/Balanceada/Agressiva) NÃO viram 3 linhas nem uma tabela nova
-- — são multiplicadores determinísticos aplicados em código sobre a MESMA premissa base (ver
-- ESTRATEGIAS em estrategia/expansao/intelligence/estrategias.ts), documentados e visíveis,
-- não 3 configurações independentes que o usuário precisa manter sincronizadas. Regra dos 3
-- (DECISION_LOG.md): 3 estratégias fixas e nomeadas não justificam uma tabela genérica de N
-- estratégias configuráveis nesta fase.

create table if not exists cenario_expansao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null default 'Cenário principal',

  -- Premissa de capital (seção 23 do brief: snapshot preservado, nunca recalculado
  -- silenciosamente). Pré-preenchido com o caixa real na criação do cenário, mas editável —
  -- permite tanto "quanto eu realmente posso expandir hoje" quanto "e se eu tivesse X".
  capital_disponivel numeric(14,2) not null,
  reserva_minima numeric(14,2) not null default 0,

  -- Próximo veículo (seção 5)
  preco_veiculo numeric(14,2) not null,
  entrada_por_veiculo numeric(14,2) not null,
  taxa_juros_am_pct numeric(6,3) not null,
  prazo_financiamento_meses integer not null,
  sistema_amortizacao sistema_amortizacao not null default 'price',

  -- Economia do veículo (seção 7)
  aluguel_semanal_por_veiculo numeric(10,2) not null,
  ocupacao_pct numeric(5,2) not null,
  km_mensal_por_veiculo numeric(10,2) not null default 0,
  seguro_mensal_por_veiculo numeric(10,2) not null default 0,
  ipva_anual_por_veiculo numeric(10,2) not null default 0,
  rastreador_mensal_por_veiculo numeric(10,2) not null default 0,
  manutencao_por_km numeric(10,4) not null default 0,
  contador_mensal numeric(10,2) not null default 0,
  aliquota_tributos_pct numeric(6,3) not null default 0,

  -- Horizonte e venda programada (seções 11 e 13)
  horizonte_meses integer not null default 24 check (horizonte_meses in (12,24,36,60)),
  venda_programada_mes integer,
  venda_valor_estimado numeric(14,2),
  venda_custos_pct numeric(6,3) not null default 0,

  -- DSCR (seção 15) — parâmetros de gestão explícitos, não verdade universal. Defaults são os
  -- mesmos usados por bancos/fundos de crédito estruturado (>=1.5 saudável, <1.0 insuficiente
  -- pra cobrir a própria dívida) — ainda assim editáveis por cenário.
  dscr_minimo_saudavel numeric(5,2) not null default 1.5,
  dscr_minimo_atencao numeric(5,2) not null default 1.1,

  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint chk_cenario_expansao_venda_programada check (
    (venda_programada_mes is null and venda_valor_estimado is null) or
    (venda_programada_mes is not null and venda_valor_estimado is not null)
  )
);

comment on table cenario_expansao is
  'Épico 9, Fase 1 — premissas de um cenário do Motor de Expansão da Frota. Diferente de '
  'cenario_simulacao (hipotético, independente da frota real): este cenário é sempre avaliado '
  'contra caixa/dívida/equity/frota REAIS, calculados ao vivo no momento da simulação, nunca '
  'persistidos aqui.';
comment on column cenario_expansao.capital_disponivel is
  'Snapshot editável — pré-preenchido do caixa real (calcularSaldoPorConta) na criação, mas '
  'pode ser sobrescrito pelo usuário para testar "e se eu tivesse X". Preservado como premissa '
  '(seção 23 do brief) para a simulação salva não mudar silenciosamente se o caixa real mudar depois.';

create index if not exists idx_cenario_expansao_empresa on cenario_expansao(empresa_id);

drop trigger if exists trg_cenario_expansao_atualizado_em on cenario_expansao;
create trigger trg_cenario_expansao_atualizado_em before update on cenario_expansao
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_cenario_expansao_audit on cenario_expansao;
create trigger trg_cenario_expansao_audit after insert or update or delete on cenario_expansao
  for each row execute function public.fn_audit_log();

alter table cenario_expansao enable row level security;

-- Mesmo gate do resto do Centro de Estratégia (eh_owner_da_empresa(), migration 0014) — dado
-- de capital/dívida/expansão é tão sensível quanto Políticas/Central de Decisão.
drop policy if exists "cenario_expansao: select por owner" on cenario_expansao;
create policy "cenario_expansao: select por owner" on cenario_expansao
  for select using (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());

drop policy if exists "cenario_expansao: insert por owner" on cenario_expansao;
create policy "cenario_expansao: insert por owner" on cenario_expansao
  for insert with check (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());

drop policy if exists "cenario_expansao: update por owner" on cenario_expansao;
create policy "cenario_expansao: update por owner" on cenario_expansao
  for update using (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());

drop policy if exists "cenario_expansao: delete por owner" on cenario_expansao;
create policy "cenario_expansao: delete por owner" on cenario_expansao
  for delete using (empresa_id = public.current_empresa_id() and public.eh_owner_da_empresa());
