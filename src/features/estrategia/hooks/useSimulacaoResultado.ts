import { useMemo } from 'react';
import { simularCrescimentoEmpresarial, type SimulacaoResultado } from '../intelligence/simulacaoEmpresarial';
import type { CenarioSimulacaoInput } from '../types';

// Central de Decisão v2 — "tempo real" de verdade: a simulação é matemática pura, roda no
// navegador, sem round-trip nenhum ao banco. Recalcula sempre que qualquer campo do cenário
// muda (o chamador passa o cenário vindo de estado local do componente, não de uma query).
// Persistir no banco é uma preocupação separada (autosave debounced no componente que edita).
export function useSimulacaoResultado(cenario: CenarioSimulacaoInput | null): SimulacaoResultado | null {
  return useMemo(() => (cenario ? simularCrescimentoEmpresarial(cenario) : null), [cenario]);
}
