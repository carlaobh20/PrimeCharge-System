// Ponto único de acesso público desta pasta para fora do módulo Veículos.
//
// DEC-008 proíbe uma feature importar direto de outra feature — mas o Command Center
// (Sprint 5) existe justamente para consolidar a inteligência de todas as features, e
// recalcular a regra de cada uma dentro de command-center/ duplicaria lógica e quebraria
// DEC-022 (a regra de negócio de cada entidade só existe num lugar). A saída registrada em
// DEC-024 é uma exceção pontual e explícita: agregadores (Command Center hoje, Dashboard/BI
// futuramente) podem importar as funções puras de cálculo de uma feature através de um
// barril como este — nunca direto de dentro da pasta. Isso mantém a regra de negócio
// morando só em features/frota/intelligence/, com um único ponto auditável de saída.
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

// gerarRiscos é 100% genérica (sem nenhum dado específico de veículo) — mora em shared/
// desde a Sprint 6 (ver DEC-025), reexportada aqui só para não quebrar quem já importa
// risco através deste barril.
export { gerarRiscos } from '@/shared/intelligence/risks';
export type { RisksInput } from '@/shared/intelligence/risks';
