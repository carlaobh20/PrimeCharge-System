-- Épico 4 — "Ativo Financeiro", Parte 9 (Contrato). Missão do Carlos pediu: "Valor semanal,
-- Valor mensal, Dia de vencimento, Data de reajuste, Índice, Forma de pagamento, Garantia,
-- Caução, Multa, Juros — dados serão utilizados futuramente pelo financeiro".
--
-- Duas decisões de escopo (desvio deliberado do pedido literal, documentado em vez de
-- silencioso, per instrução do Carlos "se achar arquitetura melhor, pare e explique"):
--
-- 1) NÃO cria `valor_semanal`/`valor_mensal` — `contratos` já tem `valor_periodico` +
--    `periodicidade` (diaria/semanal/mensal), migration 0005. Criar os dois campos novos
--    duplicaria o mesmo dado guardado de duas formas — exatamente o que o Carlos pediu pra
--    evitar ("não quero duplicada").
--
-- 2) NÃO cria uma coluna `caucao` nova — `valor_caucao` já existe (migration 0005) e cobre
--    exatamente isso. `garantia` (tipo_garantia abaixo) é tratado como um conceito DIFERENTE de
--    caução: o MECANISMO de garantia (caução em dinheiro, fiador, seguro-fiança, nenhuma), não
--    um valor. Palpite documentado — não é 100% certeza da intenção original, fica marcado pro
--    Carlos confirmar/corrigir.

do $$ begin
  create type contrato_forma_pagamento as enum ('pix', 'boleto', 'cartao', 'dinheiro', 'transferencia');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contrato_tipo_garantia as enum ('caucao', 'fiador', 'seguro_fianca', 'nenhuma');
exception when duplicate_object then null; end $$;

alter table contratos
  add column if not exists dia_vencimento smallint check (dia_vencimento between 1 and 31),
  add column if not exists data_reajuste date,
  add column if not exists indice_reajuste text,
  add column if not exists forma_pagamento contrato_forma_pagamento,
  add column if not exists tipo_garantia contrato_tipo_garantia,
  add column if not exists percentual_multa_atraso numeric(5,2),
  add column if not exists percentual_juros_atraso numeric(5,2);

comment on column contratos.dia_vencimento is 'Dia do mês em que o pagamento periódico vence (1-31) — não é a data_inicio, é o dia recorrente.';
comment on column contratos.data_reajuste is 'Próxima data prevista de reajuste do valor_periodico pelo indice_reajuste.';
comment on column contratos.indice_reajuste is 'Texto livre (ex. "IGPM", "IPCA") — não é enum porque o índice usado varia por contrato e por época.';
comment on column contratos.percentual_multa_atraso is 'Multa por atraso de pagamento, em % sobre a parcela.';
comment on column contratos.percentual_juros_atraso is 'Juros de mora por atraso, em % ao mês sobre a parcela.';
