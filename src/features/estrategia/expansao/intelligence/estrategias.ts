import type { EstrategiaExpansao } from '../types';

// Épico 9 — Motor de Expansão, Fase 1. As 3 estratégias são multiplicadores determinísticos
// sobre a MESMA premissa base do cenário (nunca 3 configurações independentes que o usuário
// precisaria manter sincronizadas — Regra dos 3, DECISION_LOG.md) — só ajustam QUANTO do capital
// disponível o motor tenta comprometer agora e QUANTA reserva de segurança extra exigir acima do
// reserva_minima já configurado no cenário.
//
// [PALPITE — precisa confirmação do Carlos]: esta sessão sofreu um corte de contexto no meio da
// implementação do Épico 9 e a definição literal de "Conservadora/Balanceada/Agressiva" do brief
// original não estava mais disponível no momento em que este arquivo foi escrito. Os
// multiplicadores abaixo são minha melhor hipótese de engenharia financeira (perfil de risco
// crescente: quanto do capital é comprometido agora × quanta reserva extra é exigida × se usa
// capital reciclável) — NÃO confirmados linha a linha contra o texto original do brief. Reportado
// explicitamente no relatório de entrega (tarefa #89) — não trate como spec fechada sem revisão.
export type MultiplicadorEstrategia = {
  /** Fração do capital_disponivel do cenário que o motor tenta comprometer com aquisição de veículos nesta estratégia (0–1). */
  fracaoCapitalUsavel: number;
  /** Multiplicador sobre reserva_minima do cenário — >1 exige reserva extra (mais conservador), <1 relaxa a reserva (mais agressivo). */
  multiplicadorReserva: number;
  /** Se true, soma o capital reciclável (venda de veículos já sinalizados com status 'venda') ao capital disponível para aquisição. */
  usaCapitalReciclavel: boolean;
};

export const ESTRATEGIAS: Record<EstrategiaExpansao, MultiplicadorEstrategia> = {
  conservadora: { fracaoCapitalUsavel: 0.5, multiplicadorReserva: 1.5, usaCapitalReciclavel: false },
  balanceada: { fracaoCapitalUsavel: 0.75, multiplicadorReserva: 1.0, usaCapitalReciclavel: false },
  agressiva: { fracaoCapitalUsavel: 1.0, multiplicadorReserva: 0.5, usaCapitalReciclavel: true },
};
