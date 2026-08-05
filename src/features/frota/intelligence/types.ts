// Vehicle Intelligence — Sprint 3/4. Camada de regras/métricas, sem IA e sem UI.
// Nenhum arquivo dentro de intelligence/ importa React ou o client do Supabase — só
// funções puras (input de dados já carregados → output de score/insight/alerta/ação).
// Ver DEC-022 e DEC-023 no DECISION_LOG.md.
//
// Os formatos de exibição (Insight, Alerta, NextAction, HealthScoreResult...) são
// genéricos e vivem em shared/intelligence/types.ts — reexportados aqui para não quebrar
// os imports já existentes neste módulo. Só o que é específico do domínio Veículo mora
// diretamente neste arquivo.
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
  ComparativoItem,
  ComparativoResult,
} from '@/shared/intelligence/types';

// Chaves de Command Action que a inteligência do veículo pode sugerir como Próxima Ação —
// subconjunto de ActionKey (lib/actions.ts) + 'editar-valores' (não é um Command Action,
// é um link direto para a tela de edição).
export type NextActionKey = 'documento' | 'status' | 'tag' | 'editar-valores' | 'comentario';
