-- Épico 9 — Motor de Expansão e Alocação de Capital, Fase 2 (Crescimento Composto). Migration 0033.
--
-- A Fase 1 (migration 0032) resolve "quantos veículos cabem AGORA" — capacidade estática, 1 lote
-- comprado no mês 0. A Fase 2 responde "como a frota evolui ao longo do tempo, reciclando o
-- próprio resultado operacional e produto de venda em novas compras" — precisa de 2 premissas
-- novas por cenário: quando cada veículo projetado é vendido (relativo à própria compra, não um
-- mês absoluto único como venda_programada_mes/venda_valor_estimado da Fase 1, que continuam
-- existindo e servindo à Fase 1 sem alteração) e por qual valor. E precisa que o horizonte aceite
-- 48 meses (Fase 1 só previa 12/24/36/60).
--
-- método_crescimento: só 2 dos 3 métodos pedidos foram implementados nesta fase (escopo cortado
-- explicitamente autorizado — "se ficar grande demais, implemente primeiro caixa operacional +
-- venda programada"). 'caixa_aporte' fica reservado no enum para a Fase 3, mas o motor ainda não
-- sabe simulá-lo — se alguém selecionar essa opção antes da Fase 3 implementar, o código do
-- frontend precisa recusar, não fingir que calculou.

alter table cenario_expansao
  drop constraint if exists cenario_expansao_horizonte_meses_check;
alter table cenario_expansao
  add constraint cenario_expansao_horizonte_meses_check check (horizonte_meses in (12,24,36,48,60));

alter table cenario_expansao
  add column if not exists vender_apos_meses integer,
  add column if not exists valor_venda_por_veiculo numeric(14,2),
  add column if not exists metodo_crescimento text not null default 'caixa_operacional';

alter table cenario_expansao
  drop constraint if exists chk_cenario_expansao_metodo_crescimento;
alter table cenario_expansao
  add constraint chk_cenario_expansao_metodo_crescimento
    check (metodo_crescimento in ('caixa_operacional','caixa_e_venda','caixa_aporte'));

alter table cenario_expansao
  drop constraint if exists chk_cenario_expansao_venda_por_veiculo;
alter table cenario_expansao
  add constraint chk_cenario_expansao_venda_por_veiculo check (
    (vender_apos_meses is null and valor_venda_por_veiculo is null) or
    (vender_apos_meses is not null and valor_venda_por_veiculo is not null and vender_apos_meses > 0)
  );

comment on column cenario_expansao.vender_apos_meses is
  'Fase 2 — cada veículo PROJETADO (não os reais da frota atual) é vendido este número de meses '
  'depois da própria compra, se preenchido. null = motor não vende nenhum veículo projetado '
  '(método "somente caixa operacional"). Distinto de venda_programada_mes (Fase 1: um único mês '
  'absoluto, um único evento, não recorrente).';
comment on column cenario_expansao.valor_venda_por_veiculo is
  'Fase 2 — premissa do usuário (DEC-022: nunca inferida de FIPE/mercado), aplicada a TODO '
  'veículo projetado que for vendido nesta simulação. Um valor só, não uma curva de depreciação.';
comment on column cenario_expansao.metodo_crescimento is
  '"caixa_operacional": só reinveste o fluxo de caixa das operações. "caixa_e_venda": reinveste '
  'fluxo de caixa + produto líquido das vendas programadas (vender_apos_meses). "caixa_aporte": '
  'reservado para a Fase 3 (não implementado — motor recusa se selecionado).';
