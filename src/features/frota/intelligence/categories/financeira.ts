import { calcularSaudeFinanceira as calcularSaudeFinanceiraCompartilhada } from '@/shared/intelligence/saudeFinanceira';
import type { SaudeFinanceiraInput } from '@/shared/intelligence/saudeFinanceira';
import type { CategoriaHealthResult } from '../types';

/**
 * Saúde Financeira — regra real desde a Sprint 8 (DEC-047): pagamentos pendentes/atrasados
 * vinculados a este veículo (via lancamentos.veiculo_id). A regra em si mora em shared/
 * (genérica, sem dado de domínio — DEC-048); esta função só existe para manter a assinatura
 * "uma calcularSaudeX por categoria" já usada nas demais (operacional/documental/patrimonial).
 */
export function calcularSaudeFinanceira(input: SaudeFinanceiraInput): CategoriaHealthResult {
  return calcularSaudeFinanceiraCompartilhada(input);
}
