// Driver Intelligence — Sprint 6. Mesmo contrato de features/frota/intelligence/types.ts:
// camada de regras/métricas, sem IA e sem UI, nenhum arquivo dentro de intelligence/ importa
// React ou o client do Supabase — só funções puras (input de dados já carregados → output de
// score/insight/alerta/ação). Ver DEC-022, DEC-023 e DEC-025 no DECISION_LOG.md.
//
// Os formatos de exibição são genéricos e vivem em shared/intelligence/types.ts — reexportados
// aqui para não obrigar import duplo em quem consome este módulo. Só o que é específico do
// domínio Motorista mora diretamente neste arquivo.
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

// Chaves de Command Action que a inteligência do motorista pode sugerir como Próxima Ação —
// subconjunto de ActionKey (lib/actions.ts) + 'editar-cnh' (não é um Command Action, é um
// link direto para a tela de edição — mesmo padrão de 'editar-valores' no Veículo).
export type NextActionKey = 'documento' | 'status' | 'tag' | 'comentario' | 'editar-cnh';
