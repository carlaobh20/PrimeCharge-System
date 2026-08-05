import type { CategoriaHealthResult } from '../types';

/**
 * Saúde Comercial — sem regra real ainda: depende de contrato/motorista vinculado, que só
 * existe quando o módulo Comercial/Contratos for construído. Score null de propósito.
 */
export function calcularSaudeComercial(): CategoriaHealthResult {
  return {
    categoria: 'comercial',
    label: 'Saúde Comercial',
    score: null,
    status: 'sem_dado',
    motivos: ['Depende do módulo Comercial/Contratos, ainda não construído.'],
  };
}
