import { calcularSaudeFinanceira as calcularSaudeFinanceiraCompartilhada } from '@/shared/intelligence/saudeFinanceira';
import type { SaudeFinanceiraInput } from '@/shared/intelligence/saudeFinanceira';
import type { CategoriaHealthResult } from '../types';

/**
 * Saúde Financeira — regra real desde a Sprint 8 (DEC-047): pagamentos pendentes/atrasados
 * vinculados a este motorista (via lancamentos.motorista_id). Regra genérica em shared/
 * (DEC-048) — mesmo raciocínio de Veículo/Contrato.
 */
export function calcularSaudeFinanceira(input: SaudeFinanceiraInput): CategoriaHealthResult {
  return calcularSaudeFinanceiraCompartilhada(input);
}
