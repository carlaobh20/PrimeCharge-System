-- Épico 3 — Central de Decisão Empresarial: reconstrução do cenário (2026-08-09).
--
-- Reconstrução pedida explicitamente pelo Carlos ("considere a implementação atual apenas como
-- rascunho") em cima de cenario_simulacao (migration 0016), criada há poucas horas na sessão.
-- Duas mudanças estruturais:
--
--   1. Deixa de ser singleton por empresa. O Card "Comparador de Cenários" (Conservador/Atual/
--      Agressivo, salvos e comparados) é o 2º/3º consumidor real que justifica isso — mesma
--      regra dos 3 que manteve a tabela singleton até agora. Ganha `nome`.
--
--   2. Premissas financeiras reformuladas: aluguel passa de mensal para SEMANAL (unidade real
--      do negócio de locação), e os custos deixam de ser só seguro+IPVA — ganham rastreador,
--      lavagem, manutenção, depreciação (% ao mês) e licenciamento. Como a unidade do aluguel
--      mudou (não é só renomear coluna — o número que estava lá tinha outro significado),
--      qualquer cenário de teste já salvo precisa ser reintroduzido pelo usuário; não é dado de
--      operação real da empresa, é simulação hipotética, sem risco de perda de informação real.
--
-- amortizacao_estrategia/amortizacao_valor_manual: schema já nasce pronto para o motor de
-- amortização (Fase 3 do plano combinado com o Carlos) — a coluna existe agora pra não precisar
-- de uma 3ª migration só pra isso, mas o motor de cálculo só vai agir sobre ela na Fase 3.

alter table cenario_simulacao drop constraint if exists cenario_simulacao_empresa_id_key;
create index if not exists idx_cenario_simulacao_empresa_id on cenario_simulacao (empresa_id);

alter table cenario_simulacao add column if not exists nome text not null default 'Cenário principal';

alter table cenario_simulacao drop column if exists aluguel_esperado_mensal_por_veiculo;
alter table cenario_simulacao add column if not exists aluguel_esperado_semanal_por_veiculo numeric(10,2) not null default 0;

alter table cenario_simulacao add column if not exists rastreador_mensal_por_veiculo numeric(10,2) not null default 0;
alter table cenario_simulacao add column if not exists lavagem_mensal_por_veiculo numeric(10,2) not null default 0;
alter table cenario_simulacao add column if not exists manutencao_mensal_por_veiculo numeric(10,2) not null default 0;
alter table cenario_simulacao add column if not exists depreciacao_am_pct numeric(6,3) not null default 0;
alter table cenario_simulacao add column if not exists licenciamento_anual_por_veiculo numeric(10,2) not null default 0;

alter table cenario_simulacao drop constraint if exists chk_cenario_simulacao_amortizacao;
alter table cenario_simulacao add column if not exists amortizacao_estrategia text not null default 'nunca';
alter table cenario_simulacao add constraint chk_cenario_simulacao_amortizacao check (
  amortizacao_estrategia in ('nunca','quando_sobrar_caixa','todo_mes','a_cada_6_meses','manual')
);
alter table cenario_simulacao add column if not exists amortizacao_valor_manual numeric(14,2);
