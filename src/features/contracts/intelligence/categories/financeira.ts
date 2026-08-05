import type { CategoriaHealthResult } from '../types';

/**
 * Saúde Financeira — sem regra real ainda: depende de pagamento/inadimplência por contrato,
 * que só existe quando o módulo Financeiro for construído (Fase 3). Score null de propósito —
 * nunca um valor inventado só pra preencher a categoria (DEC-022). Mesmo texto/padrão de
 * calcularSaudeFinanceira em Veículo e Motorista.
 */
export function calcularSaudeFinanceira(): CategoriaHealthResult {
  return {
    categoria: 'financeira',
    label: 'Saúde Financeira',
    score: null,
    status: 'sem_dado',
    motivos: ['Depende do módulo Financeiro, ainda não construído.'],
  };
}
