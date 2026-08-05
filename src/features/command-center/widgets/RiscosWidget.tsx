import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { RiskCard } from '@/shared/components/intelligence/RiskCard';
import type { PrioritizedRisk } from '../types';

export function RiscosWidget({ riscos }: { riscos: PrioritizedRisk[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <ShieldAlert className="h-3.5 w-3.5" />
        Riscos
      </h2>
      {riscos.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Nenhum risco identificado em toda a operação.
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {riscos.map((risco) => (
            <li key={risco.id}>
              <RiskCard risco={risco} />
              <span className="mt-0.5 block text-[11px] text-neutral-400">{risco.origemLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
