import type { CategoriaHealthResult } from '../types';

export type SaudeComercialInput = {
  totalContratos: number;
  contratosAtivos: number;
  /** Contratos cancelados (não "encerrado" — que é conclusão normal) — sinal negativo real. */
  contratosCancelados: number;
};

/**
 * Saúde Comercial — regra real desde a Sprint 8 (dado de Contrato já existia desde a Sprint 7,
 * só não tinha sido conectado ao Health Score do Motorista ainda; mesmo lançamento de trabalho
 * que ativou a categoria financeira, DEC-047). Contrato cancelado é o único sinal negativo
 * direto disponível hoje — "cancelado" e "encerrado" são estados terminais distintos desde
 * DEC-034, e só o primeiro representa uma ruptura, não uma conclusão normal de relação.
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
