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
