-- PrimeCharge OS — 0052 — FASE 20 (2ª passada): view derivada `motorista_localizacoes_atual`
-- ============================================================================================
-- ⚠️ NÃO APLICADA EM PRODUÇÃO (mesmo status de 0051 — depende dela). Validada só no harness
-- local.
-- ============================================================================================
-- JUSTIFICATIVA:
-- A 0051 (comentário original, seção 4) deliberadamente NÃO criou esta view por segurança:
-- uma view sobre uma tabela com RLS avalia RLS com o privilégio do DONO da view, a menos que
-- declare `security_invoker` explicitamente (Postgres 15+) — risco real se esquecido.
--
-- A especificação da 2ª passada da Fase 20 (Módulo 11 — API STAFF) pede explicitamente
-- `DISTINCT ON ou equivalente PostgreSQL eficiente` para "última posição por veículo", em vez
-- do que a API staff fazia até aqui: buscar até 500 linhas cruas ordenadas por
-- timestamp_localizacao e deduplicar em memória no cliente (JS). Essa dedup em memória tinha um
-- risco real e não hipotético: numa frota grande, as últimas 500 CAPTURAS (não os últimos 500
-- VEÍCULOS) podem vir todas de poucos veículos muito ativos, deixando de fora a última posição
-- de um veículo que capturou há mais tempo — o card "SEM LOCALIZAÇÃO" mentiria pra esse veículo.
--
-- Com `security_invoker = true` (Postgres 15+, disponível na engine local 16.13) o risco que
-- fez a 0051 evitar a view deixa de existir: a view roda com os PRIVILÉGIOS DE QUEM CONSULTA,
-- então as MESMAS 3 policies RLS de `motorista_localizacoes` (Módulo 3/seção 3 da 0051) se
-- aplicam sem alteração nenhuma — a view não abre nem uma linha a mais do que a tabela base já
-- abriria pra esse mesmo usuário. Testado explicitamente na suíte 69 (grupo 11): motorista só
-- vê a própria linha através da view; staff só vê a própria empresa através da view.
--
-- Colunas explícitas (nunca `select *`), mesmo princípio de todo o resto do projeto.
-- ============================================================================================

drop view if exists motorista_localizacoes_atual;
create view motorista_localizacoes_atual
with (security_invoker = true)
as
select distinct on (veiculo_id)
  id,
  motorista_id,
  veiculo_id,
  empresa_id,
  contrato_id,
  latitude,
  longitude,
  accuracy_m,
  timestamp_localizacao,
  origem,
  criado_em
from motorista_localizacoes
order by veiculo_id, timestamp_localizacao desc;

comment on view motorista_localizacoes_atual is
  'Fase 20 (2ª passada) — última posição conhecida por veículo, derivada de motorista_localizacoes '
  '(DISTINCT ON, security_invoker=true — RLS da tabela base se aplica sem alteração). '
  'Nunca armazena nada por conta própria: puramente uma consulta nomeada.';
