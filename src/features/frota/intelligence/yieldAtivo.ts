// Épico 4 — "Ativo Financeiro", Parte 4. Yield = quanto o veículo rende por mês em relação ao
// que ele vale HOJE (não ao que custou) — é isso que permite comparar dois carros diferentes
// (um novo caro, um usado barato) pelo retorno real que cada um dá, igual um "cap rate" de
// imóvel. Por isso o denominador é resolverValorAtualVeiculo (mercado > FIPE > compra), nunca
// valor_compra puro.
//
// Anualização: nominal simples (yieldMensal × 12), não composta — a missão pede "números e
// gráficos", não uma projeção de reinvestimento; composta implicaria assumir que a receita do
// aluguel é reinvestida no próprio ativo, o que não é o caso aqui.
import { calcularReceitaMensalEquivalente } from '@/shared/lib/receitaContrato';
import { resolverValorAtualVeiculo, fonteValorAtualVeiculo, type FonteValorAtivo } from '@/shared/lib/valorAtivo';
import type { Veiculo } from '../types';
import type { Contrato } from '@/features/contracts/types';

export type ResumoYieldAtivo = {
  receitaMensal: number | null;
  valorAtual: number | null;
  fonteValorAtual: FonteValorAtivo;
  yieldMensalPct: number | null;
  yieldAnualPct: number | null;
};

export function calcularYieldAtivo(
  veiculo: Pick<Veiculo, 'valor_mercado' | 'valor_fipe' | 'valor_compra'>,
  contratoAtivo: Pick<Contrato, 'valor_periodico' | 'periodicidade'> | null
): ResumoYieldAtivo {
  const valorAtual = resolverValorAtualVeiculo(veiculo);
  const fonte = fonteValorAtualVeiculo(veiculo);
  const receitaMensal = contratoAtivo
    ? calcularReceitaMensalEquivalente(contratoAtivo.valor_periodico, contratoAtivo.periodicidade)
    : null;

  // Sem valor atual cadastrado ou sem contrato ativo: não dá pra calcular yield — retorna null
  // em vez de 0%, que pareceria "o ativo não rende nada" quando na verdade é "sem dado".
  if (valorAtual === null || valorAtual === 0 || receitaMensal === null) {
    return { receitaMensal, valorAtual, fonteValorAtual: fonte, yieldMensalPct: null, yieldAnualPct: null };
  }

  const yieldMensalPct = (receitaMensal / valorAtual) * 100;
  const yieldAnualPct = yieldMensalPct * 12;

  return { receitaMensal, valorAtual, fonteValorAtual: fonte, yieldMensalPct, yieldAnualPct };
}
