import { calcularSaldoPorConta } from '@/features/financeiro/intelligence';
import { calcularResumoFinanciamentoReal } from '@/features/frota/intelligence';
import { resolverValorAtualVeiculo } from '@/shared/lib/valorAtivo';
import type { ContaBancaria, Pagamento } from '@/features/financeiro/types';
import type { Veiculo } from '@/features/frota/types';

// Épico 9 — Motor de Expansão, Fase 1. "Estado real" = os 4 números que a missão pede pra
// nunca confundir (Caixa, Dívida, Equity, Frota) — TODOS derivados ao vivo de dado já
// existente, NENHUM novo cálculo de negócio, NENHUM valor persistido (mesmo princípio de
// calcularSaldoPorConta: número que fica velho é pior que número recalculado). Reaproveita:
// calcularSaldoPorConta (financeiro/intelligence, migration/Sprint 8), calcularResumoFinanceiro
// (financiamentoReal.ts, frota/intelligence, Épico 4) e resolverValorAtualVeiculo (valorAtivo.ts,
// Épico 4, prioridade mercado > FIPE > compra).

export type EstadoRealFrota = {
  caixaAtual: number;
  dividaAtual: number;
  /** Soma de resolverValorAtualVeiculo() de cada veículo ainda na frota (não 'encerrado'). Veículo sem nenhuma das 3 fontes de valor (mercado/FIPE/compra) não entra na soma — nunca inventamos valor (DEC-022). */
  valorTotalFrota: number;
  /** valorTotalFrota − dividaAtual. Pode ser negativo se a frota está mais endividada do que vale hoje — não escondemos isso atrás de um floor em 0. */
  equityFrota: number;
  veiculosAtuais: number;
  /** Quantos veículos entraram em valorTotalFrota (tinham alguma fonte de valor) — denominador honesto, mesmo padrão de `veiculosComValorCompra` em capitalAllocation.ts. */
  veiculosComValorConhecido: number;
};

export function calcularEstadoRealFrota(
  veiculos: Veiculo[],
  contas: ContaBancaria[],
  pagamentosPagos: (Pick<Pagamento, 'conta_bancaria_id' | 'valor'> & { tipo: 'receita' | 'despesa' })[],
  hoje: Date = new Date()
): EstadoRealFrota {
  const saldosPorConta = calcularSaldoPorConta(
    contas.map((c) => ({ id: c.id, saldo_inicial: c.saldo_inicial })),
    pagamentosPagos
  );
  const caixaAtual = Object.values(saldosPorConta).reduce((soma, v) => soma + v, 0);

  // "Atual" = ainda é ativo da empresa. 'encerrado' é o único status que representa saída
  // definitiva da frota (ver VEICULO_STATUS_TRANSICOES, frota/types.ts) — 'venda' ainda é
  // propriedade da empresa até a venda de fato acontecer, continua contando.
  const veiculosNaFrota = veiculos.filter((v) => v.status !== 'encerrado');

  let dividaAtual = 0;
  let valorTotalFrota = 0;
  let veiculosComValorConhecido = 0;

  for (const veiculo of veiculosNaFrota) {
    const resumoFinanciamento = calcularResumoFinanciamentoReal(veiculo, hoje);
    if (resumoFinanciamento && !resumoFinanciamento.quitado) {
      dividaAtual += resumoFinanciamento.saldoDevedorAtual;
    }

    const valorAtual = resolverValorAtualVeiculo(veiculo);
    if (valorAtual !== null) {
      valorTotalFrota += valorAtual;
      veiculosComValorConhecido += 1;
    }
  }

  return {
    caixaAtual,
    dividaAtual,
    valorTotalFrota,
    equityFrota: valorTotalFrota - dividaAtual,
    veiculosAtuais: veiculosNaFrota.length,
    veiculosComValorConhecido,
  };
}
