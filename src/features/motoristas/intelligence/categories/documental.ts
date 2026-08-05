import type { CategoriaHealthResult } from '../types';

const DIAS_ALERTA_VENCIMENTO_CNH = 30;

/**
 * Saúde Documental — regra real, combinando dois sinais:
 * 1. Quantidade de documentos cadastrados (mesma régua de calcularSaudeDocumental do Veículo).
 * 2. Validade da CNH (`cnh_validade`) — motorista tem esse campo desde já, diferente do
 *    Veículo (que ainda não tem data de validade em `arquivos`), então aqui a regra já nasce
 *    mais rica: CNH vencida é crítico, vencendo em até 30 dias é atenção.
 */
export function calcularSaudeDocumental(input: {
  totalDocumentos: number;
  diasAteVencimentoCnh: number | null;
}): CategoriaHealthResult {
  const { totalDocumentos, diasAteVencimentoCnh } = input;
  const motivos: string[] = [];
  let score: number;

  if (totalDocumentos === 0) {
    score = 30;
    motivos.push('Nenhum documento cadastrado.');
  } else if (totalDocumentos === 1) {
    score = 70;
    motivos.push('Apenas 1 documento cadastrado.');
  } else {
    score = 100;
    motivos.push(`${totalDocumentos} documentos cadastrados.`);
  }

  if (diasAteVencimentoCnh === null) {
    score -= 20;
    motivos.push('Validade da CNH não cadastrada.');
  } else if (diasAteVencimentoCnh < 0) {
    score = Math.min(score, 20);
    motivos.push(`CNH vencida há ${Math.abs(diasAteVencimentoCnh)} dias.`);
  } else if (diasAteVencimentoCnh <= DIAS_ALERTA_VENCIMENTO_CNH) {
    score = Math.min(score, 60);
    motivos.push(`CNH vence em ${diasAteVencimentoCnh} dias.`);
  } else {
    motivos.push(`CNH válida por mais ${diasAteVencimentoCnh} dias.`);
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 80 ? 'ok' : score >= 50 ? 'atencao' : 'critico';

  return { categoria: 'documental', label: 'Saúde Documental', score, status, motivos };
}
