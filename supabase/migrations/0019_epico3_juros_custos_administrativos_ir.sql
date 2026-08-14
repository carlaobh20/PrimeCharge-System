-- Épico 3 — Central de Decisão Empresarial: juros sobre caixa parado, custos administrativos e IR
-- (2026-08-10).
--
-- Pedido do Carlos: "em reinvestimento, precisamos colocar a taxa de juros anual, dai vc calcula
-- por mes o juros do dinheiro aplicado" + "abaixo do reinvestimento, quero que coloque os custos
-- administrativos... abertura de empresa, contador, IR da operação".
--
-- Todas as colunas nascem com default 0 — cenários já salvos continuam se comportando exatamente
-- como antes (sem juros sobre caixa, sem custo de abertura, sem contador, sem IR) até o dono
-- preencher esses campos. Mesma lógica de reserva_de_seguranca (migration 0018).

alter table cenario_simulacao add column if not exists taxa_juros_investimento_aa_pct numeric(6,3) not null default 0;
alter table cenario_simulacao add column if not exists custo_abertura_empresa numeric(12,2) not null default 0;
alter table cenario_simulacao add column if not exists contador_mensal numeric(10,2) not null default 0;
alter table cenario_simulacao add column if not exists taxa_ir_pct numeric(6,3) not null default 0;
