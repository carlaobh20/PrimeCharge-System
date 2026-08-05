import type { CategoriaHealthResult } from '../types';

/**
 * Saúde Patrimonial — sem regra real ainda: para um Motorista, esta categoria representaria
 * o(s) veículo(s) vinculados a ele (estado/valor do ativo em uso), o que só existe quando o
 * módulo de Contratos vincular Motorista↔Veículo. Score null de propósito — mesmo padrão de
 * calcularSaudeFinanceira/calcularSaudeComercial do Veículo (DEC-022).
 */
export function calcularSaudePatrimonial(): CategoriaHealthResult {
  return {
    categoria: 'patrimonial',
    label: 'Saúde Patrimonial',
    score: null,
    status: 'sem_dado',
    motivos: ['Depende do vínculo Motorista↔Veículo via módulo de Contratos, ainda não construído.'],
  };
}
