import type { Veiculo } from '../types';
import { calcularSaudeOperacional } from './categories/operacional';
import { calcularSaudeDocumental } from './categories/documental';
import { calcularSaudePatrimonial } from './categories/patrimonial';
import { calcularSaudeFinanceira } from './categories/financeira';
import { calcularSaudeComercial, type SaudeComercialInput } from './categories/comercial';
import type { HealthScoreResult } from './types';
import type { SaudeFinanceiraInput } from '@/shared/intelligence/saudeFinanceira';

export type HealthScoreInput = {
  veiculo: Pick<Veiculo, 'status' | 'valor_compra' | 'valor_fipe' | 'valor_mercado'>;
  totalDocumentos: number;
  diasDesdeUltimoEvento: number | null;
  saudeFinanceira: SaudeFinanceiraInput;
  saudeComercial: SaudeComercialInput;
};

// Agregador do Health Score. Cada categoria calcula seu próprio score (ou null, se ainda
// não tem regra real por trás) — a média geral só considera as categorias com score real,
// nunca preenche uma categoria "sem_dado" com um valor arbitrário pra fechar a conta.
export function calcularHealthScore(input: HealthScoreInput): HealthScoreResult {
  const categorias = [
    calcularSaudeOperacional({ veiculo: input.veiculo, diasDesdeUltimoEvento: input.diasDesdeUltimoEvento }),
    calcularSaudeDocumental({ totalDocumentos: input.totalDocumentos }),
    calcularSaudePatrimonial({ veiculo: input.veiculo }),
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
