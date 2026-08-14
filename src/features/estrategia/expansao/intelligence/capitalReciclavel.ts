import { calcularResumoFinanciamentoReal } from '@/features/frota/intelligence';
import { resolverValorAtualVeiculo } from '@/shared/lib/valorAtivo';
import type { Veiculo } from '@/features/frota/types';

// Épico 9 — Motor de Expansão, Fase 1. "Capital reciclável" = dinheiro que a empresa já decidiu
// liberar — veículo com status 'venda' (já sinalizado para venda pelo próprio usuário, não uma
// suposição minha) — que pode financiar a próxima aquisição. NUNCA soma veículo em operação
// normal ('ativo'/'manutencao'/etc.): só o que o usuário já marcou como saindo da frota.

export type VeiculoReciclavel = {
  veiculoId: string;
  valorEstimado: number;
  saldoDevedor: number;
  custosVenda: number;
  /** valorEstimado − saldoDevedor − custosVenda, com piso em 0 — um veículo pode valer menos do que deve; isso não vira "reciclável negativo" (a diferença é dívida que sobra, não capital que aparece). */
  liquidoEstimado: number;
};

export type CapitalReciclavelResult = {
  veiculos: VeiculoReciclavel[];
  totalLiquido: number;
};

export function calcularCapitalReciclavel(
  veiculos: Veiculo[],
  vendaCustosPct: number,
  hoje: Date = new Date()
): CapitalReciclavelResult {
  const candidatos = veiculos.filter((v) => v.status === 'venda');
  const detalhes: VeiculoReciclavel[] = [];

  for (const veiculo of candidatos) {
    // valor_venda (usuário já negociou um valor concreto) tem prioridade sobre a estimativa de
    // mercado — dado explícito > dado inferido (DEC-022).
    const valorEstimado = veiculo.valor_venda ?? resolverValorAtualVeiculo(veiculo);
    if (valorEstimado === null) continue; // sem nenhuma fonte de valor — não inventamos.

    const resumoFinanciamento = calcularResumoFinanciamentoReal(veiculo, hoje);
    const saldoDevedor = resumoFinanciamento && !resumoFinanciamento.quitado ? resumoFinanciamento.saldoDevedorAtual : 0;
    const custosVenda = valorEstimado * (vendaCustosPct / 100);
    const liquidoEstimado = Math.max(0, valorEstimado - saldoDevedor - custosVenda);

    detalhes.push({ veiculoId: veiculo.id, valorEstimado, saldoDevedor, custosVenda, liquidoEstimado });
  }

  return { veiculos: detalhes, totalLiquido: detalhes.reduce((soma, v) => soma + v.liquidoEstimado, 0) };
}
