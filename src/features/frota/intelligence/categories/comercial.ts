import type { CategoriaHealthResult } from '../types';

export type SaudeComercialInput = {
  totalContratos: number;
  contratosAtivos: number;
  /** Contratos cancelados (não "encerrado" — que é conclusão normal) — sinal negativo real. */
  contratosCancelados: number;
};

/**
 * Saúde Comercial — regra real desde a auditoria de CTO (2026-08-06, ver DECISION_LOG.md).
 * Dado de Contrato existe desde a Sprint 7 e já alimenta esta mesma categoria do lado do
 * Motorista desde a Sprint 8 (DEC-047/048) — o score continuava hardcoded `null` aqui só
 * porque ninguém tinha conectado o Veículo ao mesmo dado, não porque a regra fosse diferente.
 * Mesma lógica exata de `motoristas/intelligence/categories/comercial.ts`, deliberadamente —
 * "contrato cancelado" tem o mesmo peso de sinal negativo dos dois lados da relação.
 */
export function calcularSaudeComercial(input: SaudeComercialInput): CategoriaHealthResult {
  if (input.totalContratos === 0) {
    return {
      categoria: 'comercial',
      label: 'Saúde Comercial',
      score: null,
      status: 'sem_dado',
      motivos: ['Nenhum contrato vinculado ainda.'],
    };
  }

  const motivos: string[] = [];
  let score = 100;

  if (input.contratosCancelados > 0) {
    score -= Math.min(60, input.contratosCancelados * 30);
    motivos.push(`${input.contratosCancelados} contrato(s) cancelado(s).`);
  }
  if (input.contratosAtivos > 0) {
    motivos.push(`${input.contratosAtivos} contrato(s) ativo(s) no momento.`);
  }
  if (motivos.length === 0) {
    motivos.push(`${input.totalContratos} contrato(s) no histórico, nenhum cancelamento.`);
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 80 ? 'ok' : score >= 50 ? 'atencao' : 'critico';

  return { categoria: 'comercial', label: 'Saúde Comercial', score, status, motivos };
}
