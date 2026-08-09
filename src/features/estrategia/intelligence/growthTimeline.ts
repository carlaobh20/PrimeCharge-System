import type { ResumoCapitalAlocado } from './capitalAllocation';
import type { PoliticasEmpresa } from '../types';

// Épico 3, Missão 1 — Timeline de Crescimento (segunda fatia do Planejamento Mestre).
//
// Regra de honestidade (DEC-022), a mesma de sempre: os estágios abaixo NÃO são um simulador
// ("o que aconteceria se eu comprasse mais 10 carros") — são a mesma unidade econômica REAL já
// calculada por calcularCapitalAlocado() (capital investido, receita, despesa e lucro por
// veículo, vindos de dado de verdade), multiplicada pela quantidade de veículos de cada marco.
// Ou seja: "se o próximo veículo se comportar como a média dos que você já tem, isto é o que N
// veículos custariam/gerariam". O brief do Carlos pediu explicitamente pra NÃO construir ainda
// o simulador completo (que vai incluir sazonalidade, financiamento real, funcionários,
// infraestrutura, tecnologia e riscos — Épico 3, Fase 7, Simulação Empresarial). Por isso os
// campos que dependem de premissas que não existem no dado hoje (funcionários necessários,
// infraestrutura, tecnologia, fluxo de caixa com timing de recebíveis, riscos) não aparecem
// aqui como número inventado — ficam de fora do tipo até terem uma base de cálculo real.
export const MARCOS_FROTA = [1, 5, 10, 20, 50, 100, 250, 500, 1000] as const;

export type EstagioTimeline = {
  veiculos: number;
  /** true = a empresa já tem frota >= este marco hoje (estágio já alcançado). */
  jaAlcancado: boolean;
  capitalNecessario: number | null;
  receitaMensalProjetada: number | null;
  despesaMensalProjetada: number | null;
  lucroMensalProjetado: number | null;
  /**
   * Teto de financiamento permitido pela política definida em Políticas da Empresa
   * (financiamento_maximo_pct × capital necessário). Null se a política não foi definida —
   * nunca inventamos um percentual default.
   */
  financiamentoMaximoPermitido: number | null;
};

export type TimelineDeCrescimento = {
  frotaAtual: number;
  /** Quantos veículos da frota atual tinham dado completo (valor_compra + histórico operacional) suficiente pra entrar na média. Mostrado pra dar transparência de amostra, não é decoração. */
  tamanhoDaAmostra: number;
  /** Motivo textual quando `tamanhoDaAmostra === 0` — nenhuma projeção é calculável ainda. */
  motivoSemProjecao: string | null;
  estagios: EstagioTimeline[];
};

export function calcularTimelineDeCrescimento(
  resumo: ResumoCapitalAlocado,
  politicas: PoliticasEmpresa | null
): TimelineDeCrescimento {
  const frotaAtual = resumo.veiculosComValorCompra + resumo.veiculosSemValorCompra;

  // Amostra: só veículos com pelo menos 1 mês de operação registrado (senão a "taxa mensal"
  // seria dividida por um período irreal). Reaproveita mesosDeOperacao já calculado em
  // calcularCapitalAlocado — nenhuma conta nova aqui além da média simples.
  const amostra = resumo.rankingPorRoi.filter((v) => v.mesesDeOperacao >= 1);

  const media = (valores: number[]) => (valores.length === 0 ? null : valores.reduce((a, b) => a + b, 0) / valores.length);

  const capitalMedioPorVeiculo = media(resumo.rankingPorRoi.map((v) => v.valorInvestido));
  const receitaMediaMensalPorVeiculo = media(amostra.map((v) => v.receitaConfirmada / v.mesesDeOperacao));
  const despesaMediaMensalPorVeiculo = media(amostra.map((v) => v.despesaConfirmada / v.mesesDeOperacao));
  const lucroMedioMensalPorVeiculo = media(amostra.map((v) => v.lucroConfirmado / v.mesesDeOperacao));

  const financiamentoMaximoPct = politicas?.financiamento_maximo_pct ?? null;

  const estagios: EstagioTimeline[] = MARCOS_FROTA.map((veiculos) => {
    const capitalNecessario = capitalMedioPorVeiculo === null ? null : capitalMedioPorVeiculo * veiculos;
    return {
      veiculos,
      jaAlcancado: frotaAtual >= veiculos,
      capitalNecessario,
      receitaMensalProjetada: receitaMediaMensalPorVeiculo === null ? null : receitaMediaMensalPorVeiculo * veiculos,
      despesaMensalProjetada: despesaMediaMensalPorVeiculo === null ? null : despesaMediaMensalPorVeiculo * veiculos,
      lucroMensalProjetado: lucroMedioMensalPorVeiculo === null ? null : lucroMedioMensalPorVeiculo * veiculos,
      financiamentoMaximoPermitido:
        capitalNecessario === null || financiamentoMaximoPct === null ? null : (capitalNecessario * financiamentoMaximoPct) / 100,
    };
  });

  const motivoSemProjecao =
    amostra.length === 0
      ? 'Nenhum veículo tem valor de compra + pelo menos 1 mês de operação registrado ainda — sem isso não dá pra calcular uma média confiável de receita/despesa/lucro por veículo.'
      : null;

  return {
    frotaAtual,
    tamanhoDaAmostra: amostra.length,
    motivoSemProjecao,
    estagios,
  };
}
