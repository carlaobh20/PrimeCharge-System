import type { CategoriaHealthResult } from '../types';

/**
 * Saúde Documental — regra real, mesmo padrão de calcularSaudeDocumental (Veículo/Motorista):
 * contrato sem nenhum arquivo anexado (o próprio contrato assinado, principalmente) é o sinal
 * mais simples e mais real que existe hoje sobre completude documental.
 */
export function calcularSaudeDocumental(input: { totalDocumentos: number }): CategoriaHealthResult {
  const { totalDocumentos } = input;
  const motivos: string[] = [];
  let score = 100;

  if (totalDocumentos === 0) {
    score -= 50;
    motivos.push('Nenhum documento anexado (contrato assinado, vistoria...).');
  } else if (totalDocumentos === 1) {
    score -= 15;
    motivos.push('Apenas 1 documento anexado até agora.');
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 80 ? 'ok' : score >= 50 ? 'atencao' : 'critico';

  if (motivos.length === 0) motivos.push('Documentação em dia.');

  return { categoria: 'documental', label: 'Saúde Documental', score, status, motivos };
}
