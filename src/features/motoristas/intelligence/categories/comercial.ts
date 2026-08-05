import type { CategoriaHealthResult } from '../types';

/**
 * Saúde Comercial — sem regra real ainda: depende de histórico de contrato(s) do motorista,
 * que só existe quando o módulo de Contratos for construído. Score null de propósito.
 */
export function calcularSaudeComercial(): CategoriaHealthResult {
  return {
    categoria: 'comercial',
    label: 'Saúde Comercial',
    score: null,
    status: 'sem_dado',
    motivos: ['Depende do módulo de Contratos, ainda não construído.'],
  };
}
