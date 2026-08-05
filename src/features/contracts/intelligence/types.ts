// Contract Intelligence — Sprint 7. Mesmo contrato de features/frota/intelligence/types.ts e
// features/motoristas/intelligence/types.ts: camada de regras/métricas, sem IA e sem UI —
// nenhum arquivo dentro de intelligence/ importa React ou o client do Supabase, só funções
// puras (input de dado já carregado → output de score/insight/alerta/ação). Ver DEC-022,
// DEC-023, DEC-025 no DECISION_LOG.md.
export type {
  HealthCategoriaId,
  HealthStatus,
  CategoriaHealthResult,
  HealthScoreResult,
  InsightSeveridade,
  Insight,
  AlertaSeveridade,
  Alerta,
  NextAction,
  Opportunity,
  Risk,
  ComparativoItem,
  ComparativoResult,
} from '@/shared/intelligence/types';

// Chaves de Command Action que a inteligência do contrato pode sugerir como Próxima Ação —
// subconjunto de ActionKey (lib/actions.ts).
export type NextActionKey = 'status' | 'documento' | 'renovar' | 'comentario' | 'tag';
