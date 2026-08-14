-- Épico 3 — Central de Decisão Empresarial: Forma de Aquisição (2026-08-13).
--
-- Referência: "Auditoria — Simulador Financeiro (Central de Decisão Empresarial / Visão
-- Executiva)" (2026-08-13). A auditoria encontrou que o simulador (cenario_simulacao) só tinha
-- `valor_entrada_por_veiculo` e `valor_financiado_por_veiculo` — nenhum jeito explícito de
-- distinguir "compra à vista" (onde o usuário digita o preço cheio em "Entrada" e zera
-- "Financiado") de "compra financiada" com entrada. Numericamente os dois casos já funcionavam
-- (preço = entrada + financiado sempre, capital próprio = entrada sempre — nenhum dos dois
-- precisou de campo novo), mas a INTERFACE não tinha como lembrar qual escolha o dono fez ao
-- reabrir um cenário salvo, nem mostrar/esconder os campos certos (taxa, prazo — Parte 2 da
-- missão do Carlos) sem re-adivinhar isso toda vez a partir dos números.
--
-- Esta coluna é só para orientar a INTERFACE (qual bloco de campos mostrar) — não muda nenhuma
-- fórmula financeira por si só. capital_proprio_investido continua = valor_entrada_por_veiculo
-- em ambos os casos (a correção real do "capital investido" está no motor, não aqui).
--
-- Compatibilidade com cenários existentes (Parte 19 da missão): regra explícita e única,
-- aplicada no backfill abaixo — financiado > 0 vira 'financiado', senão vira 'avista'. Não há
-- caminho de código "legado" separado depois disso: a coluna nasce preenchida pra toda linha
-- existente, e passa a ser obrigatória (not null) daqui em diante.

create type forma_aquisicao_veiculo as enum ('avista', 'financiado');

alter table cenario_simulacao add column if not exists forma_aquisicao forma_aquisicao_veiculo;

update cenario_simulacao
  set forma_aquisicao = (case when valor_financiado_por_veiculo > 0 then 'financiado' else 'avista' end)::forma_aquisicao_veiculo
  where forma_aquisicao is null;

alter table cenario_simulacao alter column forma_aquisicao set not null;
alter table cenario_simulacao alter column forma_aquisicao set default 'financiado';
