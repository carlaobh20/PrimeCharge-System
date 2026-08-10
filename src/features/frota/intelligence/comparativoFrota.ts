import type { VeiculoComRelacoes } from '../types';
import type { VeiculoIntelligenceSnapshot } from '@/features/command-center/services/fleetIntelligenceCollector';
import { resolverValorAtualVeiculo } from '@/shared/lib/valorAtivo';
import { calcularRoi } from '@/features/financeiro/intelligence/roi';
import { calcularCustoPorKm } from './investmentSimulator';

export type ComparativoFrotaItem = {
  veiculo: VeiculoComRelacoes;
  healthScore: number | null;
  km: number;
  valorAtual: number | null;
  receitaConfirmada: number;
  despesaConfirmada: number;
  lucroConfirmado: number;
  roiPercentual: number | null;
  custoPorKm: number | null;
};

type LancamentoParaComparativo = { veiculo_id: string | null; tipo: 'receita' | 'despesa'; status: string; valor: number };

// Épico 4 — "FROTA", seção 12 (Comparativo). Reaproveita healthScore já calculado pelo mesmo
// snapshot do Dashboard da Frota (useFleetIntelligenceSnapshots) e calcularRoi/calcularCustoPorKm
// já usados no Cockpit individual (investmentSimulator.ts, financeiro/intelligence/roi.ts) — nem
// ROI nem custo/km são recalculados de outro jeito aqui.
//
// "Depreciação", "Seguro" (custo isolado), "Sinistros", "Tempo parado/alugado" e "Receita
// perdida" (pedidos no brief original) NÃO entraram aqui — não têm fonte de dado confiável
// ainda (depreciação exigiria série histórica de valor, que não existe; seguro como categoria
// de despesa depende de `lancamentos.categoria` ser preenchido de forma consistente, o que a
// auditoria não confirmou; sinistro/tempo parado dependem de estruturas que ainda não existem —
// ver Fase B/C). Métricas aqui: só o que já é 100% real e reaproveitado.
export function calcularItensComparativo(
  frota: VeiculoComRelacoes[],
  snapshots: VeiculoIntelligenceSnapshot[],
  lancamentos: LancamentoParaComparativo[]
): ComparativoFrotaItem[] {
  const healthPorVeiculo = new Map(snapshots.map((s) => [s.veiculo.id, s.healthScore.overall]));

  return frota.map((veiculo) => {
    const lancamentosDoVeiculo = lancamentos.filter((l) => l.veiculo_id === veiculo.id && l.status === 'confirmada');
    const receitaConfirmada = lancamentosDoVeiculo.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    const despesaConfirmada = lancamentosDoVeiculo.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
    const lucroConfirmado = receitaConfirmada - despesaConfirmada;

    const { roiPercentual } = calcularRoi(lucroConfirmado, veiculo.valor_compra);
    const { valor: custoPorKm } = calcularCustoPorKm(despesaConfirmada, veiculo.quilometragem);

    return {
      veiculo,
      healthScore: healthPorVeiculo.get(veiculo.id) ?? null,
      km: veiculo.quilometragem,
      valorAtual: resolverValorAtualVeiculo(veiculo),
      receitaConfirmada,
      despesaConfirmada,
      lucroConfirmado,
      roiPercentual,
      custoPorKm,
    };
  });
}

export type MetricaOrdenacao = 'lucro' | 'roi' | 'health' | 'km' | 'valor';

export function ordenarComparativo(itens: ComparativoFrotaItem[], metrica: MetricaOrdenacao): ComparativoFrotaItem[] {
  const valor = (item: ComparativoFrotaItem): number => {
    switch (metrica) {
      case 'lucro':
        return item.lucroConfirmado;
      case 'roi':
        return item.roiPercentual ?? -Infinity;
      case 'health':
        return item.healthScore ?? -Infinity;
      case 'km':
        return item.km;
      case 'valor':
        return item.valorAtual ?? -Infinity;
    }
  };
  return [...itens].sort((a, b) => valor(b) - valor(a));
}
