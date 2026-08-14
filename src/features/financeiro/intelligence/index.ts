// Ponto único de acesso público desta pasta para fora do módulo Financeiro — mesma exceção
// registrada em DEC-024: agregadores (Command Center, futuramente BI) importam as funções
// puras de cálculo através deste barril, nunca direto de dentro da pasta.
export { calcularResumoFinanceiro } from './resumoFinanceiro';
export type { ResumoFinanceiroInput, ResumoFinanceiro } from './resumoFinanceiro';

// calcularSaldoPorConta só tinha consumidor dentro da própria feature até o Épico 9 (Motor de
// Expansão, estrategia/expansao/intelligence/estadoReal.ts precisa de caixa real por conta) —
// reexportado aqui agora, mesma exceção DEC-024 de sempre: através do barril, nunca direto no
// arquivo.
export { calcularSaldoPorConta } from './resumoFinanceiro';

export { calcularRoi } from './roi';
export type { RoiResult } from './roi';

// calcularSaudeFinanceira é 100% genérica (sem nenhum dado específico de Lançamento/
// Pagamento além de "data prevista") — mora em shared/ desde a Sprint 8 (DEC-047/DEC-048),
// mesmo raciocínio de gerarRiscos (DEC-025). Reexportada aqui só para quem já importa
// Financial Intelligence através deste barril não precisar saber disso.
export { calcularSaudeFinanceira } from '@/shared/intelligence/saudeFinanceira';
export type { SaudeFinanceiraInput } from '@/shared/intelligence/saudeFinanceira';
