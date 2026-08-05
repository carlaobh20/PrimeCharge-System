import type { CategoriaHealthResult } from '../types';

/**
 * Saúde Documental — regra real, hoje limitada a "existe pelo menos 1 documento cadastrado".
 * Ainda não dá pra avaliar vencimento (CRLV, seguro…) porque `arquivos` não tem campo de
 * data de validade — quando existir, essa regra fica mais rica sem mudar a assinatura.
 */
export function calcularSaudeDocumental(input: { totalDocumentos: number }): CategoriaHealthResult {
  const { totalDocumentos } = input;
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

  const status = score >= 80 ? 'ok' : score >= 50 ? 'atencao' : 'critico';
  motivos.push('Vencimento de documento ainda não é avaliado — falta o campo de validade no cadastro de arquivo.');

  return { categoria: 'documental', label: 'Saúde Documental', score, status, motivos };
}
