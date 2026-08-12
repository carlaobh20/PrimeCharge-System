// Épico 10 — Fase 3.2 (2026-08-12). Fonte única do gate "dá pra comprar mais um veículo agora?".
//
// ORIGEM (auditoria pedida antes de mexer): a mesma checagem de 2 etapas existia, escrita à mão,
// em 2 lugares:
//   1) `crescimentoComposto.ts` (Épico 9, `tentarComprar`, closure local, não exportada) —
//      reserva mínima primeiro, depois DSCR projetado do próximo mês (NOI projetado incluindo o
//      veículo candidato / parcelas projetadas incluindo a 1ª parcela do candidato), contra
//      `cenario.dscr_minimo_atencao`. `noiAtual` ali soma receita−custo de cada veículo ativo
//      (Fase 2.1: por veículo, não uniforme) e SUBTRAI `cenario.contador_mensal` — uma despesa
//      fixa da empresa que só existe no modelo do Épico 9.
//   2) `cicloDeVenda.ts` (Épico 10 Fase 2, `podeComprar`, closure local, não exportada) — MESMA
//      fórmula de 2 etapas, contra `opcoes.dscrMinimoAtencao`. `noiAtual` ali é
//      `ativos().length × (receitaMensal − custoMensal)` (frota uniforme, sem contador mensal —
//      esse conceito não existe no cenário do Épico 10).
// `comparadorMomentosDeVenda.ts` (Épico 10 Fase 1) tinha só a metade 1 (reserva) — a auditoria da
// Fase 3.1 (relatório `relatorio-epico10-fase3.1-auditoria-2026-08-12.md`) mostrou isso causando
// recomendações que o motor com DSCR bloquearia (caixa negativo em cenários de reserva baixa +
// economia marginal do veículo).
//
// DECISÃO (Fase 3.2, opção 1 escolhida pelo Carlos): extrair o NÚCLEO da fórmula (a comparação
// matemática em si — reserva, depois DSCR) pra esta função pura, e fazer os 3 lugares chamarem
// ela. O que NÃO foi unificado, de propósito: como cada motor CALCULA noiAtual/parcelasAtivas
// (isso depende da forma de cada cenário — `contador_mensal` só existe no Épico 9, frota
// uniforme vs. por veículo real são coisas diferentes dos 2 motores) — a função abaixo só recebe
// os números já prontos, nunca lê `cenario.*` diretamente, então nenhum dos dois formatos de
// cenário precisa mudar.
export type ParametrosCapacidadeDeCompra = {
  caixa: number;
  entrada: number;
  reservaMinima: number;
  /** NOI (receita − custos operacionais, já com qualquer dedução própria do chamador — ex.: o
   * contador mensal do Épico 9 — aplicada ANTES de chegar aqui) gerado pela frota ativa hoje,
   * sem contar o veículo candidato. */
  noiAtual: number;
  /** NOI marginal que o veículo candidato adicionaria (receita unitária − custo operacional unitário dele). */
  noiMarginalCandidato: number;
  /** Soma das parcelas já projetadas da frota ativa pro mês de referência (mesma convenção dos 2 motores: mês seguinte ao mês corrente). */
  parcelasAtivasProjetadas: number;
  /** Parcela da 1ª prestação do veículo candidato (1ª linha da tabela de amortização nova). */
  parcelaCandidato: number;
  dscrMinimoAtencao: number;
  /** Tolerância numérica pro teste de caixa (ponto flutuante). Default 1 (mesma usada em
   * `comparadorMomentosDeVenda.ts`/`cicloDeVenda.ts`) — `crescimentoComposto.ts` usa 1e-6 e
   * passa isso explicitamente, pra não mudar o comportamento já validado daquele motor. */
  epsilonCaixa?: number;
};

export type ResultadoCapacidadeDeCompra =
  | { pode: true }
  | { pode: false; motivo: 'reserva' }
  | { pode: false; motivo: 'dscr'; dscrProjetado: number };

/**
 * Gate de 2 etapas — reserva mínima primeiro (mais barato de checar, e histórico: era a única
 * trava que existia), DSCR projetado depois, só se a reserva passar. Mesma ordem, mesma fórmula,
 * nos 3 lugares que chamam esta função.
 */
export function avaliarCapacidadeDeCompra(p: ParametrosCapacidadeDeCompra): ResultadoCapacidadeDeCompra {
  const eps = p.epsilonCaixa ?? 1;
  const custoMinimo = p.entrada + p.reservaMinima;
  if (p.caixa + eps < custoMinimo) return { pode: false, motivo: 'reserva' };

  const noiProjetado = p.noiAtual + p.noiMarginalCandidato;
  const parcelasProjetadas = p.parcelasAtivasProjetadas + p.parcelaCandidato;
  const dscrProjetado = parcelasProjetadas > 0 ? noiProjetado / parcelasProjetadas : null;

  if (dscrProjetado !== null && dscrProjetado < p.dscrMinimoAtencao) {
    return { pode: false, motivo: 'dscr', dscrProjetado };
  }
  return { pode: true };
}
