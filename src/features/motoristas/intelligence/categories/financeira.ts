import type { CategoriaHealthResult } from '../types';

/**
 * Saúde Financeira — sem regra real ainda: depende de cobrança/inadimplência por motorista,
 * que só existe quando o módulo Financeiro for construído. Score null de propósito — nunca
 * um valor inventado só pra preencher a categoria (DEC-022).
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
