-- Missão 5 — Business Operating System (BOS), 2026-08-06.
--
-- Fase 1 (Auditoria) — achados corrigidos nesta migration antes de qualquer feature nova,
-- por instrução explícita da missão ("corrija apenas aquilo que realmente agrega valor
-- agora"). Ver DEC-108 no DECISION_LOG.md para o raciocínio completo de cada um.

-- ============================================================
-- 1. Índice composto em audit_log — achado #3 da auditoria de performance (Fase 1). A
--    tabela só tinha índice em `empresa_id`; `listAuditLog(tabela, registroId)` (usado pela
--    aba "Histórico" dos 3 Cockpits) filtra também por `tabela`/`registro_id` e ordena por
--    `criado_em desc` — sem índice composto, a mil veículos com anos de histórico (audit_log
--    é escrita por praticamente toda tabela do sistema via fn_audit_log), essa é a consulta
--    mais executada e menos indexada da plataforma.
-- ============================================================

create index if not exists idx_audit_log_tabela_registro on audit_log(empresa_id, tabela, registro_id, criado_em desc);

-- ============================================================
-- 2. Fase 2 — Business Operating System: `metas`.
--
-- Único conceito genuinamente novo do BOS que não existia em nenhuma forma antes (Dashboard
-- Operacional, Saúde da Empresa/Financeira/Frota/Contratos/Motoristas e Fila Operacional já
-- existem — reaproveitados de calcularResumoFinanceiro/calcularResumoDaFrota/
-- acoes_operacionais, ver DECISION_LOG.md DEC-109). `valor_atual` é atualizado manualmente
-- pelo usuário, não calculado automaticamente por tipo de meta — honestidade de dado (DEC-022):
-- calcular automaticamente exigiria uma fórmula por tipo de meta (receita, frota, utilização,
-- motoristas...) adivinhada agora sem um segundo/terceiro tipo real validando a fórmula
-- (Regra dos 3, DEC-010). Progresso manual é honesto (nunca finge saber calcular algo que não
-- calcula) e já é útil — vira automático quando um tipo de meta específico repetir 3 vezes.
-- ============================================================

do $$ begin
  create type meta_status as enum ('em_andamento','concluida','cancelada');
exception when duplicate_object then null; end $$;

create table if not exists metas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,

  titulo text not null,
  descricao text,
  unidade text not null default 'numero',

  valor_alvo numeric(14,2) not null,
  valor_atual numeric(14,2) not null default 0,
  data_alvo date,

  status meta_status not null default 'em_andamento',

  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint chk_metas_valor_alvo check (valor_alvo > 0),
  constraint chk_metas_valor_atual check (valor_atual >= 0),
  constraint chk_metas_unidade check (unidade in ('numero','moeda','percentual'))
);

create index if not exists idx_metas_empresa on metas(empresa_id, status);

drop trigger if exists trg_metas_atualizado_em on metas;
create trigger trg_metas_atualizado_em before update on metas
  for each row execute function public.fn_set_atualizado_em();

drop trigger if exists trg_metas_audit on metas;
create trigger trg_metas_audit after insert or update or delete on metas
  for each row execute function public.fn_audit_log();

alter table metas enable row level security;

-- Meta é decisão de nível empresa (founder/CTO/COO/CFO, per o próprio enquadramento da
-- missão) — gate por eh_admin_da_empresa() (super_admin/owner/admin), não por um módulo de
-- permissão granular novo (Regra dos 3 — nenhum caso real ainda pede granularidade menor).
drop policy if exists "metas: select por empresa" on metas;
create policy "metas: select por empresa" on metas
  for select using (empresa_id = public.current_empresa_id());

drop policy if exists "metas: insert por admin" on metas;
create policy "metas: insert por admin" on metas
  for insert with check (empresa_id = public.current_empresa_id() and public.eh_admin_da_empresa());

drop policy if exists "metas: update por admin" on metas;
create policy "metas: update por admin" on metas
  for update using (empresa_id = public.current_empresa_id() and public.eh_admin_da_empresa());

drop policy if exists "metas: delete por admin" on metas;
create policy "metas: delete por admin" on metas
  for delete using (empresa_id = public.current_empresa_id() and public.eh_admin_da_empresa());

-- ============================================================
-- 3. Fase 4 (Documentos) — `arquivos` ganha lineage (`criado_via`), mesmo padrão de
--    `lancamentos.criado_via`/`acoes_operacionais.origem` (migrations 0006/0007): todo
--    registro de hoje é 'manual' (upload por pessoa) — o valor real desta coluna é permitir,
--    no futuro, que Vistoria Inteligente/Agente/IA insiram um `arquivo` sem que a plataforma
--    perca a distinção de "quem/o que criou isto" (pré-requisito já registrado em
--    DATA_PLATFORM.md §4, obrigatório antes de qualquer Agente ganhar escrita em qualquer
--    tabela). Não há UI nova para isto — é só o ponto de extensão.
--
--    Deliberadamente NÃO adicionado nesta migration: `tipo_documento` catalogado (CRLV,
--    Apólice, Nota Fiscal...). Já existe uma decisão prévia e explícita no código
--    (`operacoes/intelligence/geradores/documentoGeradores.ts`, comentário) rejeitando esse
--    campo pela Regra dos 3 até um segundo caso de uso real pedir — Fase 4 desta missão não
--    muda esse fato (ainda 0 documentos reais em produção), então a decisão anterior continua
--    de pé. Ver DEC-112 no DECISION_LOG.md.
-- ============================================================

do $$ begin
  create type arquivo_origem as enum ('manual','automacao','agente','ia');
exception when duplicate_object then null; end $$;

alter table arquivos add column if not exists criado_via arquivo_origem not null default 'manual';

-- ============================================================
-- 4. Fase 6 (Data Platform) — 4 tabelas com empresa_id e dado real que nunca ganharam o
--    trigger de auditoria genérico (achado da auditoria desta fase, ver DATA_PLATFORM.md §2
--    e DECISION_LOG.md). `empresas`/`permissoes` ficam de fora de propósito (não têm coluna
--    `empresa_id` — anexar o trigger genérico quebraria em runtime).
-- ============================================================

drop trigger if exists trg_manutencoes_audit on manutencoes;
create trigger trg_manutencoes_audit after insert or update or delete on manutencoes
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_multas_audit on multas;
create trigger trg_multas_audit after insert or update or delete on multas
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_telemetria_eventos_audit on telemetria_eventos;
create trigger trg_telemetria_eventos_audit after insert or update or delete on telemetria_eventos
  for each row execute function public.fn_audit_log();

drop trigger if exists trg_convites_audit on convites;
create trigger trg_convites_audit after insert or update or delete on convites
  for each row execute function public.fn_audit_log();
