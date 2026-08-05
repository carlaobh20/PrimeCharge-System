import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { AlertCard } from '@/shared/components/intelligence/AlertCard';
import type { PrioritizedAlerta } from '../types';

export function AlertasWidget({ alertas }: { alertas: PrioritizedAlerta[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <AlertTriangle className="h-3.5 w-3.5" />
        Alertas
      </h2>
      {alertas.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Nenhum alerta em toda a frota.
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {alertas.map((alerta) => (
            <li key={alerta.id}>
              <AlertCard alerta={alerta} />
              <span className="mt-0.5 block text-[11px] text-neutral-400">{alerta.origemLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
