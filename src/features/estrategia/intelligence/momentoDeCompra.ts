import { calcularParcela, SEMANAS_POR_MES } from './simulacaoEmpresarial';
import type { CenarioSimulacaoInput } from '../types';

// Épico 3 — Central de Decisão Empresarial, Card 10 (Momento Ideal para Comprar o Próximo
// Veículo). O Carlos descreveu como "compara comprar hoje vs. esperar 3/6 meses" — este módulo
// responde essa pergunta especificamente sobre o PRÓXIMO veículo (não a frota inteira), mantendo
// entrada/financiamento fixos (não inventa uma "entrada maior se esperar" sem base no cenário).
//
// Método, documentado aqui porque isso vai pra tela de investidor/banco e precisa ser auditável:
// para cada opção de espera (0, 3, 6 meses), a frota ATUAL continua operando normalmente durante
// a espera (sem comprar nada novo — isola a decisão), acumulando caixa. Ao fim da espera, se
// houver caixa pra entrada, o veículo novo é comprado e ambos (frota atual + veículo novo) são
// projetados até um horizonte fixo de comparação (24 meses a partir de hoje, pra todas as opções
// — assim quem comprou antes não "ganha" só por ter mais meses simulados). O patrimônio líquido
// nesse horizonte é o critério de comparação.
//
// Limitação assumida (DEC-022 — honestidade de dado): isso NÃO é a simulação completa de
// crescimento (que compra o quanto for possível, reinveste etc. — motor principal). É uma
// comparação isolada de UMA decisão binária (comprar agora vs. esperar), pensada pra responder
// "devo comprar o próximo carro agora ou esperar", não pra substituir a projeção de longo prazo.

export const HORIZONTE_COMPARACAO_MESES = 24;
export const OPCOES_ESPERA_MESES = [0, 3, 6] as const;

type ProjecaoVeiculo = { valorAtual: number; saldoDevedor: number; totalParcelasPagas: number };

function projetarVeiculo(
  valorOriginal: number,
  valorFinanciado: number,
  taxaAmPct: number,
  prazoMeses: number,
  depreciacaoAmPct: number,
  meses: number
): ProjecaoVeiculo {
  const parcela = calcularParcela(valorFinanciado, taxaAmPct, prazoMeses);
  let saldoDevedor = valorFinanciado;
  let totalParcelasPagas = 0;
  for (let m = 0; m < meses; m++) {
    if (saldoDevedor <= 0) continue;
    const juros = saldoDevedor * (taxaAmPct / 100);
    const amortizacao = Math.min(parcela - juros, saldoDevedor);
    const parcelaCobrada = Math.min(parcela, saldoDevedor + juros);
    saldoDevedor = Math.max(0, saldoDevedor - amortizacao);
    totalParcelasPagas += parcelaCobrada;
  }
  const valorAtual = valorOriginal * Math.pow(1 - depreciacaoAmPct / 100, meses);
  return { valorAtual, saldoDevedor, totalParcelasPagas };
}

export type OpcaoMomentoCompra = {
  mesesDeEspera: number;
  podeComprarNoMomento: boolean;
  caixaNoMomentoDaCompra: number;
  patrimonioLiquidoNoHorizonte: number;
  caixaNoHorizonte: number;
};

export type ComparacaoMomentoCompra = {
  horizonteMeses: number;
  opcoes: OpcaoMomentoCompra[];
  /** null = nenhuma das opções testadas (0/3/6 meses) tem caixa suficiente pra entrada. */
  melhorOpcaoMesesDeEspera: number | null;
  justificativa: string;
};

export function compararMomentoDeCompra(cenario: CenarioSimulacaoInput): ComparacaoMomentoCompra {
  const custoTotalPorVeiculo = cenario.valor_entrada_por_veiculo + cenario.valor_financiado_por_veiculo;
  const aluguelMensalPorVeiculo = cenario.aluguel_esperado_semanal_por_veiculo * SEMANAS_POR_MES;
  const ipvaMensalPorVeiculo = cenario.ipva_anual_por_veiculo / 12;
  const licenciamentoMensalPorVeiculo = cenario.licenciamento_anual_por_veiculo / 12;
  const ocupacao = cenario.ocupacao_esperada_pct / 100;
  const inadimplencia = cenario.inadimplencia_esperada_pct / 100;

  const receitaLiquidaSemParcelaPorVeiculo =
    aluguelMensalPorVeiculo * ocupacao * (1 - inadimplencia) -
    (cenario.seguro_mensal_por_veiculo +
      ipvaMensalPorVeiculo +
      cenario.rastreador_mensal_por_veiculo +
      cenario.lavagem_mensal_por_veiculo +
      cenario.manutencao_mensal_por_veiculo +
      licenciamentoMensalPorVeiculo);

  const opcoes: OpcaoMomentoCompra[] = OPCOES_ESPERA_MESES.map((mesesDeEspera) => {
    // Frota atual durante a espera (sem crescer): projeta só os meses de espera pra saber
    // quanto de parcela ela paga nesse intervalo e quanto caixa sobra pra entrada do novo.
    const projFrotaNaEspera = projetarVeiculo(
      custoTotalPorVeiculo,
      cenario.valor_financiado_por_veiculo,
      cenario.taxa_juros_am_pct,
      cenario.prazo_financiamento_meses,
      cenario.depreciacao_am_pct,
      mesesDeEspera
    );
    const fluxoFrotaNaEspera =
      cenario.veiculos_iniciais * (receitaLiquidaSemParcelaPorVeiculo * mesesDeEspera - projFrotaNaEspera.totalParcelasPagas);
    const caixaNoMomentoDaCompra = cenario.capital_disponivel + fluxoFrotaNaEspera;
    // reserva_de_seguranca (2026-08-10): mesma regra do motor principal — a entrada só é viável
    // se ainda sobrar a reserva depois de pagá-la, senão essa comparação ficaria mais otimista
    // que a simulação de crescimento de verdade (que já respeita a reserva).
    const podeComprarNoMomento = caixaNoMomentoDaCompra >= cenario.valor_entrada_por_veiculo + cenario.reserva_de_seguranca;

    // Frota atual projetada até o horizonte inteiro (ela existe desde hoje, independente da espera).
    const projFrotaNoHorizonte = projetarVeiculo(
      custoTotalPorVeiculo,
      cenario.valor_financiado_por_veiculo,
      cenario.taxa_juros_am_pct,
      cenario.prazo_financiamento_meses,
      cenario.depreciacao_am_pct,
      HORIZONTE_COMPARACAO_MESES
    );
    const fluxoFrotaNoHorizonte =
      cenario.veiculos_iniciais * (receitaLiquidaSemParcelaPorVeiculo * HORIZONTE_COMPARACAO_MESES - projFrotaNoHorizonte.totalParcelasPagas);
    const patrimonioFrotaNoHorizonte = cenario.veiculos_iniciais * (projFrotaNoHorizonte.valorAtual - projFrotaNoHorizonte.saldoDevedor);

    if (!podeComprarNoMomento) {
      // Honestidade de dado: sem caixa pra comprar, não simula o veículo novo — o patrimônio no
      // horizonte é só o da frota atual (mais o caixa acumulado, sem a compra).
      const caixaNoHorizonte = cenario.capital_disponivel + fluxoFrotaNoHorizonte;
      return {
        mesesDeEspera,
        podeComprarNoMomento: false,
        caixaNoMomentoDaCompra,
        patrimonioLiquidoNoHorizonte: caixaNoHorizonte + patrimonioFrotaNoHorizonte,
        caixaNoHorizonte,
      };
    }

    const mesesDeOperacaoDoNovo = HORIZONTE_COMPARACAO_MESES - mesesDeEspera;
    const projNovo = projetarVeiculo(
      custoTotalPorVeiculo,
      cenario.valor_financiado_por_veiculo,
      cenario.taxa_juros_am_pct,
      cenario.prazo_financiamento_meses,
      cenario.depreciacao_am_pct,
      mesesDeOperacaoDoNovo
    );
    const fluxoNovo =
      receitaLiquidaSemParcelaPorVeiculo * mesesDeOperacaoDoNovo - projNovo.totalParcelasPagas - cenario.valor_entrada_por_veiculo;
    const patrimonioNovo = projNovo.valorAtual - projNovo.saldoDevedor;

    const caixaNoHorizonte = cenario.capital_disponivel + fluxoFrotaNoHorizonte + fluxoNovo;
    const patrimonioLiquidoNoHorizonte = caixaNoHorizonte + patrimonioFrotaNoHorizonte + patrimonioNovo;

    return { mesesDeEspera, podeComprarNoMomento: true, caixaNoMomentoDaCompra, patrimonioLiquidoNoHorizonte, caixaNoHorizonte };
  });

  const opcoesViaveis = opcoes.filter((o) => o.podeComprarNoMomento);
  let melhorOpcaoMesesDeEspera: number | null = null;
  let justificativa: string;

  if (opcoesViaveis.length === 0) {
    justificativa = `Nem hoje, nem em 3 ou 6 meses o caixa projetado cobre a entrada de ${formatMoedaSimples(cenario.valor_entrada_por_veiculo)} — antes de pensar no próximo veículo, o cenário precisa de mais capital ou de uma frota atual mais lucrativa.`;
  } else {
    const melhor = opcoesViaveis.reduce((a, b) => (b.patrimonioLiquidoNoHorizonte > a.patrimonioLiquidoNoHorizonte ? b : a));
    melhorOpcaoMesesDeEspera = melhor.mesesDeEspera;
    const agora = opcoes.find((o) => o.mesesDeEspera === 0);

    if (melhor.mesesDeEspera === 0) {
      const segundaMelhor = opcoesViaveis.filter((o) => o.mesesDeEspera !== 0).sort((a, b) => b.patrimonioLiquidoNoHorizonte - a.patrimonioLiquidoNoHorizonte)[0];
      const diferenca = segundaMelhor ? melhor.patrimonioLiquidoNoHorizonte - segundaMelhor.patrimonioLiquidoNoHorizonte : 0;
      justificativa = agora?.podeComprarNoMomento
        ? `Comprar agora projeta ${formatMoedaSimples(melhor.patrimonioLiquidoNoHorizonte)} de patrimônio líquido em ${HORIZONTE_COMPARACAO_MESES} meses${segundaMelhor ? `, ${formatMoedaSimples(diferenca)} a mais do que esperar ${segundaMelhor.mesesDeEspera} meses` : ''} — cada mês de espera é um mês a menos de aluguel desse veículo dentro do horizonte, e isso pesa mais do que a economia de juros de esperar.`
        : `Comprar agora não é viável (caixa insuficiente pra entrada), mas ainda assim é a opção com maior patrimônio projetado entre as testadas.`;
    } else {
      justificativa = `Esperar ${melhor.mesesDeEspera} meses projeta ${formatMoedaSimples(melhor.patrimonioLiquidoNoHorizonte)} de patrimônio líquido em ${HORIZONTE_COMPARACAO_MESES} meses — ${agora?.podeComprarNoMomento ? 'melhor do que comprar agora, porque a frota atual ainda não gera caixa suficiente pra sustentar a entrada com folga' : 'comprar agora nem é viável com o caixa atual (falta pra entrada)'}.`;
    }
  }

  return { horizonteMeses: HORIZONTE_COMPARACAO_MESES, opcoes, melhorOpcaoMesesDeEspera, justificativa };
}

function formatMoedaSimples(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
