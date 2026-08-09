import { useMemo } from 'react';
import { compararMomentoDeCompra, type ComparacaoMomentoCompra } from '../intelligence/momentoDeCompra';
import type { CenarioSimulacaoInput } from '../types';

// Mesmo padrão do useSimulacaoResultado — matemática pura local via useMemo, sem I/O. Card 10
// recalcula junto com todo o resto sempre que uma premissa muda, sem botão Simular.
export function useMomentoDeCompra(cenario: CenarioSimulacaoInput | null): ComparacaoMomentoCompra | null {
  return useMemo(() => (cenario ? compararMomentoDeCompra(cenario) : null), [cenario]);
}
