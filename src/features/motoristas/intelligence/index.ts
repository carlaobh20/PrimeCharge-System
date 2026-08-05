// Ponto único de acesso público desta pasta para fora do módulo Motoristas — mesmo padrão de
// features/frota/intelligence/index.ts (DEC-024/DEC-025): agregadores (Command Center hoje)
// podem importar as funções puras de cálculo através de um barril como este, nunca direto de
// dentro da pasta.
export { calcularHealthScore } from './healthScore';
export type { HealthScoreInput } from './healthScore';

export { gerarInsights } from './insights';
export type { InsightsInput } from './insights';

export { gerarAlertas } from './alerts';
export type { AlertsInput } from './alerts';

export { gerarProximasAcoes } from './nextActions';
export type { NextActionsInput } from './nextActions';

export { gerarOportunidades } from './opportunities';
export type { OpportunitiesInput } from './opportunities';

export { gerarComparativos } from './comparatives';
export type { ComparativosInput } from './comparatives';

// gerarRiscos é 100% genérica — mora em shared/ desde a Sprint 6 (DEC-025), reexportada aqui
// só para não obrigar um import extra em quem já importa risco através deste barril.
export { gerarRiscos } from '@/shared/intelligence/risks';
export type { RisksInput } from '@/shared/intelligence/risks';
