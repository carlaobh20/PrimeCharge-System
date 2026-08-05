import type { Veiculo } from '../types';
import type { Opportunity } from './types';

export type OpportunitiesInput = {
  veiculo: Pick<Veiculo, 'id' | 'status' | 'valor_compra' | 'valor_mercado'>;
};

// Movida de features/command-center/engine/opportunityEngine.ts na Sprint 6 (ver DEC-025) —
// a regra é do domínio Veículo, não do Command Center; ele só consolida e prioriza o que
// cada feature já calculou (mesmo princípio de Alerta/Insight/Próxima Ação, DEC-022).
//
// Primeira regra real, deliberadamente única e estreita: veículo disponível ou devolvido
// cujo valor de mercado está a 95% ou mais do valor de compra é um bom momento para avaliar
// venda — o ativo não perdeu valor relevante e não está "preso" numa locação. Não fabrica
// oportunidade sobre dado ausente.
const STATUS_ELEGIVEIS = new Set(['disponivel', 'devolvido']);
const LIMIAR_VALORIZACAO = 0.95;

export function gerarOportunidades(input: OpportunitiesInput): Opportunity[] {
  const { veiculo } = input;
  if (veiculo.valor_compra === null || veiculo.valor_mercado === null || veiculo.valor_compra <= 0) return [];
  if (!STATUS_ELEGIVEIS.has(veiculo.status)) return [];

  const percentual = veiculo.valor_mercado / veiculo.valor_compra;
  if (percentual < LIMIAR_VALORIZACAO) return [];

  return [
    {
      id: 'valorizacao',
      texto: `Valor de mercado em ${Math.round(percentual * 100)}% do valor de compra — bom momento para avaliar venda.`,
      categoria: 'patrimonial',
      valorEstimado: veiculo.valor_mercado,
    },
  ];
}
