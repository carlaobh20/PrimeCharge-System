import { calcularYieldAtivo } from '../intelligence/yieldAtivo';
import { formatMoeda } from '@/shared/lib/format';
import type { Veiculo } from '../types';
import type { Contrato } from '@/features/contracts/types';

const FONTE_LABEL: Record<'mercado' | 'fipe' | 'compra', string> = {
  mercado: 'valor de mercado',
  fipe: 'FIPE',
  compra: 'valor de compra',
};

// Épico 4, Parte 4 — "Yield do ativo": só números, sem texto explicativo (regra da missão).
// A única frase em texto é o rótulo da fonte do valor atual (mercado/FIPE/compra), necessário
// pra não passar a impressão de que os dois cards sempre usam a mesma base.
export function YieldAtivoCard({
  veiculo,
  contratoAtivo,
}: {
  veiculo: Pick<Veiculo, 'valor_mercado' | 'valor_fipe' | 'valor_compra'>;
  contratoAtivo: Pick<Contrato, 'valor_periodico' | 'periodicidade'> | null;
}) {
  const r = calcularYieldAtivo(veiculo, contratoAtivo);
  const semDado = r.yieldMensalPct === null;

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Yield do Ativo</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-neutral-400">Mensal</p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {r.yieldMensalPct !== null ? `${r.yieldMensalPct.toFixed(2)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Anual</p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {r.yieldAnualPct !== null ? `${r.yieldAnualPct.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>
      {semDado ? (
        <p className="mt-3 text-[11px] text-neutral-400">
          {r.valorAtual === null ? 'Sem valor de compra/FIPE/mercado cadastrado.' : 'Sem contrato ativo.'}
        </p>
      ) : (
        <p className="mt-3 text-[11px] text-neutral-400">
          {formatMoeda(r.receitaMensal!)}/mês sobre {formatMoeda(r.valorAtual!)} ({FONTE_LABEL[r.fonteValorAtual!]})
        </p>
      )}
    </div>
  );
}
