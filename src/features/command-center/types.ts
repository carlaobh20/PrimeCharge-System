// Command Center — Sprint 5 (ver DEC-024 no DECISION_LOG.md).
//
// Nota de estrutura: o pedido original desta sprint listava as pastas
// application/engine/widgets/cards/hooks/services/types/pages. `application/` foi
// substituída por `hooks/` (mesmo papel — orquestrar dado + engine pra UI), porque o
// projeto já tem essa convenção em toda feature existente (ver useVehicleIntelligence em
// features/frota/) e "application" reintroduziria o vocabulário de camadas DDD que a
// DEC-008 já decidiu adiar. `types/` virou `types.ts` (arquivo único), mesma convenção de
// features/frota/types.ts. O resto (engine/widgets/cards/hooks/services/pages) é literal.
import type {
  Alerta,
  HealthCategoriaId,
  HealthScoreResult,
  Insight,
  NextAction,
  Opportunity,
  PriorityMeta,
  Risk,
} from '@/shared/intelligence/types';

// Os cinco tipos de base (Alerta/Insight/NextAction/Opportunity/Risk, todos em
// shared/intelligence/types.ts) ganham PriorityMeta quando entram no Command Center — o
// cálculo de prioridade é responsabilidade do PriorityEngine, não da feature de origem
// (ver engine/priorityEngine.ts). Desde a Sprint 6 (DEC-025), Opportunity/Risk também são
// tipos de base compartilhados — cada feature (Veículos, Motoristas...) calcula sua própria
// versão na sua intelligence/, o Command Center só consolida e prioriza.
export type PrioritizedAlerta = Alerta & PriorityMeta;
export type PrioritizedInsight = Insight & PriorityMeta;
export type PrioritizedAction = NextAction & PriorityMeta & { href: string };
export type PrioritizedOpportunity = Opportunity & PriorityMeta;
export type PrioritizedRisk = Risk & PriorityMeta;

// Sprint 7 (Contratos, ver DEC-038): os cinco engines de priorização deixam de conhecer
// "Veículo" — passam a consumir este formato genérico. Cada feature que alimenta o Command
// Center (Veículos desde a Sprint 5, Motoristas e Contratos desde a Sprint 7) já calcula sua
// própria inteligência através de useXIntelligence/coletarInteligenciaDeX (nada muda ali);
// só o "envelope" que chega nos engines passa a ser este, sem `veiculo`/`motorista`/
// `contrato` embutido — origemTipo/origemId/origemLabel/hrefBase bastam pra qualquer engine
// gerar id, PriorityMeta e link, sem precisar de um `if (origem === 'veiculo')` em lugar
// nenhum. Veículos continua also produzindo o formato antigo (VeiculoIntelligenceSnapshot,
// em services/fleetIntelligenceCollector.ts) porque o fleetHealthEngine ("resumo da frota",
// fora do escopo desta sprint) ainda depende do objeto `veiculo` completo.
export type OrigemTipo = 'veiculo' | 'motorista' | 'contrato';

export type EntityIntelligenceSnapshot = {
  origemTipo: OrigemTipo;
  origemId: string;
  /** Rótulo pronto pra exibição (placa do veículo, nome do motorista...). */
  origemLabel: string;
  /** Caminho do Cockpit desta entidade (ex.: '/veiculos/123') — engines derivam o href a partir daqui, nunca hardcoded por origem. */
  hrefBase: string;
  healthScore: HealthScoreResult;
  insights: Insight[];
  alertas: Alerta[];
  proximasAcoes: NextAction[];
  oportunidades: Opportunity[];
  riscos: Risk[];
};

export type FeedItemTipo = 'alerta' | 'risco' | 'oportunidade' | 'acao';

// Formato comum usado só pelo bloco "Prioridades do Dia", que precisa comparar itens de
// tipos diferentes (alerta, risco, oportunidade, ação) na mesma lista ordenada.
export type CommandCenterFeedItem = PriorityMeta & {
  id: string;
  tipo: FeedItemTipo;
  texto: string;
  categoria: HealthCategoriaId;
  href?: string;
};
