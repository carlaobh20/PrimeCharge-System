import type { Contrato } from '../types';
import { calcularSaudeOperacional } from './categories/operacional';
import { calcularSaudeDocumental } from './categories/documental';
import { calcularSaudePatrimonial } from './categories/patrimonial';
import { calcularSaudeFinanceira } from './categories/financeira';
import { calcularSaudeComercial } from './categories/comercial';
import type { HealthScoreResult } from './types';

export type HealthScoreInput = {
  contrato: Pick<Contrato, 'status'>;
  totalDocumentos: number;
  diasAteVencimento: number | null;
  diasDesdeUltimoEvento: number | null;
};

// Agregador do Health Score do Contrato — mesmo padrão de calcularHealthScore (Veículo/
// Motorista, DEC-022): cada categoria calcula seu próprio score (ou null), a média geral só
// considera as categorias com score real. Taxonomia de 5 categorias permanece fechada
// (DEC-022/DEC-025/DEC-031) — Comercial é a única com dado 100% próprio do Contrato.
export function calcularHealthScore(input: HealthScoreInput): HealthScoreResult {
  const categorias = [
    calcularSaudeOperacional({
      contrato: input.contrato,
      diasAteVencimento: input.diasAteVencimento,
      diasDesdeUltimoEvento: input.diasDesdeUltimoEvento,
    }),
    calcularSaudeDocumental({ totalDocumentos: input.totalDocumentos }),
    calcularSaudePatrimonial(),
    calcularSaudeFinanceira(),
    calcularSaudeComercial({ contrato: input.contrato, diasAteVencimento: input.diasAteVencimento }),
  ];

  const avaliadas = categorias.filter((c) => c.score !== null);
  const overall =
    avaliadas.length === 0
      ? null
      : Math.round(avaliadas.reduce((soma, c) => soma + (c.score as number), 0) / avaliadas.length);

  return {
    overall,
    categoriasAvaliadas: avaliadas.length,
    categoriasTotais: categorias.length,
    categorias,
  };
}
