import type { CenarioSimulacao, MarcoCrescimento, TipoGatilho } from '../types';

// Épico 3 — Simulação Empresarial (2026-08-09, evolução pedida pelo Carlos em cima da primeira
// versão da Timeline de Crescimento).
//
// Diferença fundamental em relação a growthTimeline.ts/roadmap.ts (que continuam existindo, não
// foram substituídos): aquelas telas mostram o que JÁ ACONTECEU de verdade — média real dos
// veículos que a empresa já opera hoje. Esta aqui é o oposto de propósito: um simulador de
// CENÁRIO HIPOTÉTICO ("pretendo comprar X veículos, com esta taxa, este aluguel esperado...")
// pensado pra apresentar a estratégia pra investidor/banco/sócio antes de qualquer centavo ser
// gasto de verdade. Por isso ela NÃO lê dado real da frota — nasce inteiramente dos números que
// o dono preenche no cenário. As duas coexistem de propósito: uma responde "o que já rendeu", a
// outra "o que estou planejando render". Não é duplicação, é pergunta diferente.
//
// Motor mês a mês: compra `veiculos_iniciais` já no mês 0 com o capital disponível, financia o
// restante pela fórmula de amortização francesa/Price (mesma conta de qualquer financiamento
// veicular real — não é chute). Todo mês soma receita (aluguel esperado × ocupação × (1 -
// inadimplência)) menos despesa (parcela de quem ainda está financiando + seguro + IPVA/12),
// acumula lucro e — se `reinvestir_lucro` — usa o lucro do mês como caixa disponível pra comprar
// o próximo veículo assim que der pra pagar a entrada. Roda até `prazo_desejado_meses`; se a
// frota não chegar em `objetivo_veiculos` dentro do prazo, o resultado avisa isso explicitamente
// (`objetivoAlcancadoNoMes: null`) em vez de fingir que bateu — a mesma regra de honestidade
// (DEC-022) de todo o resto do projeto.

export type MesSimulado = {
  mes: number;
  frota: number;
  caixaDisponivel: number;
  receitaMensal: number;
  despesaMensal: number;
  lucroMensal: number;
  lucroAcumulado: number;
  capitalInvestidoAcumulado: number;
  roiAcumuladoPct: number | null;
};

export type StatusMarco = 'concluido' | 'proximo' | 'futuro';

export type MarcoSimulado = {
  marco: MarcoCrescimento;
  mesAlcancado: number | null;
  status: StatusMarco;
};

export type SimulacaoResultado = {
  meses: MesSimulado[];
  objetivoAlcancadoNoMes: number | null;
  frotaFinal: number;
  /** true se o capital informado não cobriu nem as entradas dos veículos iniciais pedidos — a compra inicial parou antes do total desejado. */
  avisoCapitalInicialInsuficiente: boolean;
  /** Marcos com tipo_gatilho automático (tudo menos 'manual'), ordenados cronologicamente — a espinha dorsal do roadmap visual. */
  marcosAutomaticos: MarcoSimulado[];
  /** Marcos tipo 'manual' — não têm mês projetável (o dono decide quando aconteceu), mostrados à parte, nunca misturados na linha do tempo cronológica. */
  marcosManuais: MarcoSimulado[];
};

function calcularParcela(valorFinanciado: number, taxaAmPct: number, prazoMeses: number): number {
  if (prazoMeses <= 0 || valorFinanciado <= 0) return 0;
  const i = taxaAmPct / 100;
  if (i === 0) return valorFinanciado / prazoMeses;
  return (valorFinanciado * i) / (1 - Math.pow(1 + i, -prazoMeses));
}

function valorDoMetrico(tipo: TipoGatilho, mes: MesSimulado): number | null {
  switch (tipo) {
    case 'veiculos':
      return mes.frota;
    case 'capital_disponivel':
    case 'caixa':
      // Mesma variável nesta primeira versão — "capital disponível" e "caixa acumulado" não
      // têm hoje nenhuma distinção de dado que permita separá-los (decisão registrada no
      // relatório da sessão; fácil separar depois se o Carlos definir a diferença exata).
      return mes.caixaDisponivel;
    case 'lucro':
      return mes.lucroMensal;
    case 'roi':
      return mes.roiAcumuladoPct;
    case 'receita':
      return mes.receitaMensal;
    case 'tempo':
      return mes.mes;
    case 'manual':
      return null;
  }
}

export function simularCrescimentoEmpresarial(cenario: CenarioSimulacao, marcos: MarcoCrescimento[]): SimulacaoResultado {
  const parcelaPorVeiculo = calcularParcela(cenario.valor_financiado_por_veiculo, cenario.taxa_juros_am_pct, cenario.prazo_financiamento_meses);
  const ipvaMensalPorVeiculo = cenario.ipva_anual_por_veiculo / 12;
  const ocupacao = cenario.ocupacao_esperada_pct / 100;
  const inadimplencia = cenario.inadimplencia_esperada_pct / 100;
  const custoTotalPorVeiculo = cenario.valor_entrada_por_veiculo + cenario.valor_financiado_por_veiculo;

  const mesesDeCompra: number[] = [];
  let frota = 0;
  let caixaDisponivel = cenario.capital_disponivel;
  let lucroAcumulado = 0;
  let capitalInvestidoAcumulado = 0;

  function comprarVeiculo(mes: number) {
    frota += 1;
    mesesDeCompra.push(mes);
    caixaDisponivel -= cenario.valor_entrada_por_veiculo;
    capitalInvestidoAcumulado += custoTotalPorVeiculo;
  }

  const veiculosIniciaisDesejados = Math.min(cenario.veiculos_iniciais, cenario.objetivo_veiculos);
  let avisoCapitalInicialInsuficiente = false;
  for (let n = 0; n < veiculosIniciaisDesejados; n++) {
    if (caixaDisponivel < cenario.valor_entrada_por_veiculo) {
      avisoCapitalInicialInsuficiente = true;
      break;
    }
    comprarVeiculo(0);
  }

  const meses: MesSimulado[] = [];
  let objetivoAlcancadoNoMes: number | null = frota >= cenario.objetivo_veiculos ? 0 : null;

  for (let mes = 0; mes <= cenario.prazo_desejado_meses; mes++) {
    const veiculosAindaFinanciando = mesesDeCompra.filter((mesCompra) => mes - mesCompra < cenario.prazo_financiamento_meses).length;

    const receitaMensal = frota * cenario.aluguel_esperado_mensal_por_veiculo * ocupacao * (1 - inadimplencia);
    const despesaMensal = veiculosAindaFinanciando * parcelaPorVeiculo + frota * cenario.seguro_mensal_por_veiculo + frota * ipvaMensalPorVeiculo;
    const lucroMensal = receitaMensal - despesaMensal;
    lucroAcumulado += lucroMensal;

    if (cenario.reinvestir_lucro) {
      caixaDisponivel += lucroMensal;
    }

    // Compra novos veículos a partir do mês 1 (mês 0 já tratou a leva inicial acima) enquanto o
    // caixa cobrir a entrada e o objetivo ainda não tiver sido alcançado.
    if (mes > 0) {
      while (frota < cenario.objetivo_veiculos && caixaDisponivel >= cenario.valor_entrada_por_veiculo) {
        comprarVeiculo(mes);
      }
    }

    const roiAcumuladoPct = capitalInvestidoAcumulado > 0 ? (lucroAcumulado / capitalInvestidoAcumulado) * 100 : null;

    meses.push({
      mes,
      frota,
      caixaDisponivel,
      receitaMensal,
      despesaMensal,
      lucroMensal,
      lucroAcumulado,
      capitalInvestidoAcumulado,
      roiAcumuladoPct,
    });

    if (objetivoAlcancadoNoMes === null && frota >= cenario.objetivo_veiculos) {
      objetivoAlcancadoNoMes = mes;
    }
  }

  const marcosAtivos = marcos.filter((m) => m.ativo);
  const marcosAutomaticosBase = marcosAtivos.filter((m) => m.tipo_gatilho !== 'manual');
  const marcosManuaisBase = marcosAtivos.filter((m) => m.tipo_gatilho === 'manual');

  const marcosComMes = marcosAutomaticosBase.map((marco) => {
    let mesAlcancado: number | null = null;
    for (const mesSimulado of meses) {
      const valor = valorDoMetrico(marco.tipo_gatilho, mesSimulado);
      if (valor !== null && marco.valor_gatilho !== null && valor >= marco.valor_gatilho) {
        mesAlcancado = mesSimulado.mes;
        break;
      }
    }
    return { marco, mesAlcancado };
  });

  const proximoMes = marcosComMes.reduce<number | null>((menor, atual) => {
    if (atual.mesAlcancado === null || atual.mesAlcancado <= 0) return menor;
    if (menor === null || atual.mesAlcancado < menor) return atual.mesAlcancado;
    return menor;
  }, null);

  const marcosAutomaticos: MarcoSimulado[] = [...marcosComMes]
    .sort((a, b) => {
      if (a.mesAlcancado === null && b.mesAlcancado === null) return a.marco.ordem - b.marco.ordem;
      if (a.mesAlcancado === null) return 1;
      if (b.mesAlcancado === null) return -1;
      return a.mesAlcancado - b.mesAlcancado;
    })
    .map(({ marco, mesAlcancado }) => ({
      marco,
      mesAlcancado,
      status: (mesAlcancado !== null && mesAlcancado <= 0
        ? 'concluido'
        : mesAlcancado !== null && mesAlcancado === proximoMes
          ? 'proximo'
          : 'futuro') as StatusMarco,
    }));

  const marcosManuais: MarcoSimulado[] = [...marcosManuaisBase]
    .sort((a, b) => a.ordem - b.ordem)
    .map((marco) => ({
      marco,
      mesAlcancado: null,
      status: (marco.concluido_manualmente ? 'concluido' : 'futuro') as StatusMarco,
    }));

  return {
    meses,
    objetivoAlcancadoNoMes,
    frotaFinal: frota,
    avisoCapitalInicialInsuficiente,
    marcosAutomaticos,
    marcosManuais,
  };
}
