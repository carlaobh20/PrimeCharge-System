import { useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import { formatMoeda } from '@/shared/lib/format';
import { formatarMoedaInput, digitosParaReais } from '@/shared/lib/moedaInput';
import { calcularEconomiaAmortizarExtra, calcularEconomiaQuitarHoje } from '../intelligence/financiamentoReal';
import type { Veiculo } from '../types';

// Épico 4 — "Ativo Financeiro", Parte 2. As duas perguntas que a missão pediu — "quanto
// economiza amortizando hoje" e "quanto economiza quitando hoje" — como calculadora, não como
// texto explicativo: o valor extra é um input que o usuário controla, o resultado recalcula na
// hora. Nenhuma das duas funções (financiamentoReal.ts) é nova aqui, só ganharam UI.
export function EconomiaFinanciamentoCard({ veiculo }: { veiculo: Veiculo }) {
  const [valorExtra, setValorExtra] = useState(0);
  const economiaExtra = calcularEconomiaAmortizarExtra(veiculo, valorExtra);
  const economiaQuitar = calcularEconomiaQuitarHoje(veiculo);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
        <p className="text-xs text-neutral-400">Amortizando hoje</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[11px] text-neutral-400">R$</span>
          <Input
            type="text"
            inputMode="numeric"
            className="h-7 px-1.5 text-right text-xs"
            value={formatarMoedaInput(valorExtra)}
            onChange={(e) => setValorExtra(digitosParaReais(e.target.value))}
          />
        </div>
        <p className="mt-2 text-xl font-semibold text-emerald-600 dark:text-emerald-400">{formatMoeda(economiaExtra)}</p>
        <p className="text-[11px] text-neutral-400">de juros economizados</p>
      </div>

      <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
        <p className="text-xs text-neutral-400">Quitando hoje</p>
        <p className="mt-1.5 text-xl font-semibold text-emerald-600 dark:text-emerald-400">{formatMoeda(economiaQuitar)}</p>
        <p className="text-[11px] text-neutral-400">de juros economizados</p>
      </div>
    </div>
  );
}
