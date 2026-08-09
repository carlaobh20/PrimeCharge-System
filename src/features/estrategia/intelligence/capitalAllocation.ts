import { calcularResumoFinanceiro, calcularRoi } from '@/features/financeiro/intelligence';
import { calcularPaybackMeses } from '@/features/frota/intelligence';
import type { Lancamento, PagamentoComRelacoes } from '@/features/financeiro/types';
import type { Veiculo } from '@/features/frota/types';
import { diasDesde } from '@/shared/lib/format';

export type RankingVeiculo = {
  veiculoId: string;
  placa: string;
  valorInvestido: number;
  lucroConfirmado: number;
  roiPercentual: number;
  paybackMeses: number | null;
};

export type ResumoCapitalAlocado = {
  capitalInvestidoContabilizado: number;
  veiculosSemValorCompra: number;
  lucroConfirmadoFrota: number;
  roiFrotaPercentual: number | null;
  /** Ordenado do maior ROI pro menor — só entram veículos com valor_compra conhecido (ROI real, não estimado). */
  rankingPorRoi: RankingVeiculo[];
};

// Achado da auditoria do Épico 2 (2026-08-09, claude/auditoria-epico2-centro-de-estrategia...):
// não existe hoje nenhum "lucro/ROI por veículo" agregado — calcularResumoFinanceiro()/
// calcularRoi() (financeiro/intelligence) e calcularPaybackMeses() (frota/intelligence) só
// eram chamados por entidade única, dentro da ficha de 1 veículo por vez. Esta função só
// AGRUPA o dado (por veiculo_id) e chama as mesmas funções puras já existentes em loop —
// nenhuma regra de cálculo nova nasce aqui. Mesmo princípio de honestidade (DEC-022): veículo
// sem valor_compra cadastrado entra em `veiculosSemValorCompra`, nunca é forçado a um ROI
// calculado sobre uma base inventada.
export function calcularCapitalAlocado(
  veiculos: Veiculo[],
  lancamentos: Lancamento[],
  pagamentos: PagamentoComRelacoes[]
): ResumoCapitalAlocado {
  let capitalInvestidoContabilizado = 0;
  let veiculosSemValorCompra = 0;
  let lucroConfirmadoFrota = 0;
  const rankingPorRoi: RankingVeiculo[] = [];

  for (const veiculo of veiculos) {
    const lancamentosDoVeiculo = lancamentos.filter((l) => l.veiculo_id === veiculo.id);
    const pagamentosDoVeiculo = pagamentos
      .filter((p) => p.lancamento?.veiculo_id === veiculo.id)
      .map((p) => ({
        status: p.status,
        data_prevista: p.data_prevista,
        data_pagamento: p.data_pagamento,
        valor: p.valor,
        tipo: p.lancamento!.tipo as 'receita' | 'despesa',
      }));

    const resumo = calcularResumoFinanceiro({ lancamentos: lancamentosDoVeiculo, pagamentos: pagamentosDoVeiculo });
    lucroConfirmadoFrota += resumo.lucroConfirmado;

    const valorInvestido = veiculo.valor_compra;
    if (valorInvestido === null) {
      veiculosSemValorCompra += 1;
      continue;
    }
    capitalInvestidoContabilizado += valorInvestido;

    const roi = calcularRoi(resumo.lucroConfirmado, valorInvestido);
    if (roi.roiPercentual === null) continue;

    const mesesDeOperacao = veiculo.data_compra ? Math.max(1, Math.floor((diasDesde(veiculo.data_compra) ?? 0) / 30)) : 0;
    const payback = calcularPaybackMeses(valorInvestido, resumo.lucroConfirmado, mesesDeOperacao);

    rankingPorRoi.push({
      veiculoId: veiculo.id,
      placa: veiculo.placa,
      valorInvestido,
      lucroConfirmado: resumo.lucroConfirmado,
      roiPercentual: roi.roiPercentual,
      paybackMeses: payback.meses,
    });
  }

  rankingPorRoi.sort((a, b) => b.roiPercentual - a.roiPercentual);

  const roiFrota = calcularRoi(lucroConfirmadoFrota, capitalInvestidoContabilizado || null);

  return {
    capitalInvestidoContabilizado,
    veiculosSemValorCompra,
    lucroConfirmadoFrota,
    roiFrotaPercentual: roiFrota.roiPercentual,
    rankingPorRoi,
  };
}
