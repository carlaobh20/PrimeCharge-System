import type { CategoriaHealthResult } from '../types';

/**
 * Saúde Financeira — sem regra real ainda: depende de receita/custo por veículo, que só
 * existe quando o módulo Financeiro/Contratos for construído (Sprint 3 não cria módulo
 * novo, por instrução explícita). Retorna score null de propósito — nunca um valor
 * inventado só pra preencher a categoria.
 */
export function calcularSaudeFinanceira(): CategoriaHealthResult {
  return {
    categoria: 'financeira',
    label: 'Saúde Financeira',
    score: null,
    status: 'sem_dado',
    motivos: ['Depende do módulo Financeiro/Contratos, ainda não construído.'],
  };
}
