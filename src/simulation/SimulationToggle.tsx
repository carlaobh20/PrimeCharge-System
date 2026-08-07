// Missão 7 — Modo Simulação: botão de ativar/desligar (topo do app) + badge global.
// Pedido literal: "🟢 Simulação DESLIGADA" ↔ "🔴 Simulação ATIVA", e um badge visível em
// toda tela enquanto ligada avisando que o dado é fictício.

import { RotateCcw } from 'lucide-react';
import { useSimulation } from './SimulationContext';

export function SimulationToggleButton() {
  const { isActive, isActivating, toggle } = useSimulation();

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={isActivating}
      className={
        'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60 ' +
        (isActive
          ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400'
          : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400')
      }
      title={isActive ? 'Desativar Modo Simulação — volta pro dado real imediatamente' : 'Ativar Modo Simulação — dado fictício, nada real é alterado'}
    >
      <span className="text-sm leading-none">{isActive ? '🔴' : '🟢'}</span>
      {isActivating ? 'Preparando simulação…' : isActive ? 'Simulação ATIVA' : 'Simulação DESLIGADA'}
    </button>
  );
}

export function SimulationBadge() {
  const { isActive, reiniciar } = useSimulation();
  if (!isActive) return null;

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-950 dark:bg-amber-500">
      <span>🟡 MODO SIMULAÇÃO — todos os dados exibidos são fictícios. Nenhum dado real é alterado.</span>
      <button
        type="button"
        onClick={reiniciar}
        className="flex items-center gap-1 rounded border border-amber-950/30 px-2 py-0.5 text-[11px] hover:bg-amber-950/10"
        title="Reiniciar simulação — gera um dataset novo do zero"
      >
        <RotateCcw className="h-3 w-3" />
        Reiniciar
      </button>
    </div>
  );
}
