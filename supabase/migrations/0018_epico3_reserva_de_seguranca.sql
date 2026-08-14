-- Épico 3 — Central de Decisão Empresarial: reserva de segurança (2026-08-10).
--
-- Pedido do Carlos: "quero deixar um caixa de emergência... pra comprar o carro tem que ter os
-- 36 mil [entrada] mais os 15 de segurança". Antes, o motor de simulação comprava um veículo novo
-- assim que o caixa cobrisse só a entrada — sem margem nenhuma. Essa coluna guarda o valor mínimo
-- que o motor NUNCA usa pra comprar veículo nem pra amortização extraordinária (Card 4,
-- 'quando_sobrar_caixa') — só entra em jogo se sobrar caixa acima dela.
--
-- default 0: cenários já salvos continuam se comportando exatamente como antes (compra assim que
-- cobre a entrada) até o dono decidir configurar uma reserva — não é uma mudança de comportamento
-- silenciosa pra quem já usa a Central de Decisão.

alter table cenario_simulacao add column if not exists reserva_de_seguranca numeric(12,2) not null default 0;
