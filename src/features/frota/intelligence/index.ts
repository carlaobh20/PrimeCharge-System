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

// calcularSaudePatrimonial (categorias/) é consumida por features/motoristas (Saúde
// Patrimonial do Motorista reaproveita a mesma regra do Veículo — ver comentário em
// motoristas/intelligence/categories/patrimonial.ts). Corrigido na Missão 3 (Parte 12,
// auditoria arquitetural): o import cross-feature ia direto na pasta categories/, sem
// passar por este barril — reexportado aqui para fechar o único ponto auditável de saída
// que DEC-024 pede.
export { calcularSaudePatrimonial } from './categories/patrimonial';

// gerarRiscos é 100% genérica (sem nenhum dado específico de veículo) — mora em shared/
// desde a Sprint 6 (ver DEC-025), reexportada aqui só para não quebrar quem já importa
// risco através deste barril.
export { gerarRiscos } from '@/shared/intelligence/risks';
export type { RisksInput } from '@/shared/intelligence/risks';

// calcularCustoPorKm/calcularPaybackMeses (Missão 3, investmentSimulator.ts) só tinham
// consumidor dentro da própria feature (FinanceiroTab do Cockpit de Veículo) até o Épico 2 —
// reexportados aqui agora que o Centro de Estratégia (outra feature) precisa deles em loop
// por veículo, mesma exceção DEC-024 de sempre: through the barril, nunca direto no arquivo.
export { calcularCustoPorKm, calcularPaybackMeses } from './investmentSimulator';
export type { CustoPorKmResult, PaybackResult } from './investmentSimulator';

// calcularResumoFinanciamentoReal/calcularEconomiaAmortizarExtra/calcularEconomiaQuitarHoje
// (financiamentoReal.ts, Épico 4) só tinham consumidor dentro da própria feature (Cockpit de
// Veículo) até o Épico 9 (Motor de Expansão, estrategia/expansao/intelligence/estadoReal.ts
// precisa de dívida real por veículo) — reexportados aqui agora, mesma exceção DEC-024:
// através do barril, nunca direto no arquivo.
export {
  calcularResumoFinanciamentoReal,
  calcularEconomiaAmortizarExtra,
  calcularEconomiaQuitarHoje,
} from './financiamentoReal';
export type { ResumoFinanciamentoReal } from './financiamentoReal';
