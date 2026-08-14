-- Épico 4 — "Ativo Financeiro", Parte 1 (Aquisição). Missão do Carlos: cada veículo precisa
-- conhecer o próprio financiamento real (não mais só o hipotético do simulador em /estrategia).
--
-- Decisão de escopo (auditoria prévia, reportada ao Carlos antes de codar): NÃO cria tabela nova
-- — só soma colunas em `veiculos`, que já tinha `tipo_aquisicao`/`data_compra`/`valor_compra`/
-- `valor_fipe` cobrindo metade do bloco "Compra" pedido. `fornecedor` era o único campo do bloco
-- Compra genuinamente ausente.
--
-- Decisão de honestidade de dado (mesmo princípio já usado em calcularSaldoPorConta/financeiro):
-- "Parcela inicial", "Parcela atual" e "Quitação prevista", pedidos na missão, NÃO viram coluna —
-- são sempre DERIVADOS de (valor_financiado, taxa_juros_am_pct, prazo_financiamento_meses,
-- sistema_amortizacao, primeiro_vencimento) pelo motor real de amortização (Parte 2). Persistir
-- esses três como número fixo os deixaria desatualizados a cada mês sem ninguém perceber — o
-- mesmo motivo pelo qual o financeiro nunca guarda "saldo_atual" de conta bancária.

do $$ begin
  alter type tipo_aquisicao add value if not exists 'outro';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type sistema_amortizacao as enum ('price', 'sac');
exception
  when duplicate_object then null;
end $$;

alter table veiculos
  add column if not exists fornecedor text,
  add column if not exists banco text,
  add column if not exists valor_entrada numeric(14,2),
  add column if not exists valor_financiado numeric(14,2),
  add column if not exists taxa_juros_am_pct numeric(6,3),
  add column if not exists prazo_financiamento_meses integer,
  add column if not exists sistema_amortizacao sistema_amortizacao,
  add column if not exists primeiro_vencimento_financiamento date;

comment on column veiculos.valor_entrada is 'Entrada paga na aquisição — só relevante quando tipo_aquisicao = financiamento/consorcio/leasing. NULL quando compra_direta.';
comment on column veiculos.valor_financiado is 'Valor financiado na aquisição (principal). Base do cálculo real de amortização (Épico 4, Parte 2) — substitui, por veículo real, o que hoje só existe como cenário hipotético em cenario_simulacao.';
comment on column veiculos.taxa_juros_am_pct is 'Taxa de juros ao mês do financiamento real deste veículo, em %. Mesma unidade de cenario_simulacao.taxa_juros_am_pct.';
comment on column veiculos.primeiro_vencimento_financiamento is 'Data da primeira parcela — âncora pra calcular parcela atual/saldo devedor atual a partir de hoje, sem persistir número que fica velho.';
