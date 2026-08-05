import type { Motorista } from '../types';
import { calcularSaudeOperacional } from './categories/operacional';
import { calcularSaudeDocumental } from './categories/documental';
import { calcularSaudePatrimonial } from './categories/patrimonial';
import { calcularSaudeFinanceira } from './categories/financeira';
import { calcularSaudeComercial, type SaudeComercialInput } from './categories/comercial';
import type { HealthScoreResult } from './types';
import type { SaudeFinanceiraInput } from '@/shared/intelligence/saudeFinanceira';

export type HealthScoreInput = {
  motorista: Pick<Motorista, 'status'>;
  totalDocumentos: number;
  diasAteVencimentoCnh: number | null;
  diasDesdeUltimoEvento: number | null;
  saudeFinanceira: SaudeFinanceiraInput;
  saudeComercial: SaudeComercialInput;
};

// Agregador do Health Score do Motorista — mesmo padrão de calcularHealthScore (Veículo,
// DEC-022): cada categoria calcula seu próprio score (ou null), a média geral só considera
// as categorias com score real.
export function calcularHealthScore(input: HealthScoreInput): HealthScoreResult {
  const categorias = [
    calcularSaudeOperacional({ motorista: input.motorista, diasDesdeUltimoEvento: input.diasDesdeUltimoEvento }),
    calcularSaudeDocumental({ totalDocumentos: input.totalDocumentos, diasAteVencimentoCnh: input.diasAteVencimentoCnh }),
    calcularSaudePatrimonial(),
    calcularSaudeFinanceira(input.saudeFinanceira),
    calcularSaudeComercial(input.saudeComercial),
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
