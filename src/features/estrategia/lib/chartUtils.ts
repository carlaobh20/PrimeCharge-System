import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

// Extraído do FluxoDeCaixaChart (Card 2) na Fase 2 — os Cards 3/6/7 precisam do mesmo downsample
// e duplicar essa função em cada arquivo violaria a regra do Carlos de "não duplicar código,
// criar componentes reutilizáveis". Reamostra pra no máximo `maxPontos` (gráfico ilegível com
// 100+ pontos em simulações longas — o objetivo é enxergar a tendência, não densidade de dado).
export function reamostrar(meses: MesSimulado[], maxPontos: number): MesSimulado[] {
  if (meses.length <= maxPontos) return meses;
  const passo = Math.ceil(meses.length / maxPontos);
  return meses.filter((_, i) => i % passo === 0 || i === meses.length - 1);
}
