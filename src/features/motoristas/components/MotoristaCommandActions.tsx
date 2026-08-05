import { forwardRef } from 'react';
import { COMMAND_ACTIONS, type ActionKey } from '../lib/actions';

export const MotoristaCommandActions = forwardRef<HTMLDivElement, { onAction: (key: ActionKey) => void }>(
  function MotoristaCommandActions({ onAction }, ref) {
    return (
      <div ref={ref} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ações rápidas</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {COMMAND_ACTIONS.map(({ key, label, icon: Icon, real }) => (
            <button
              key={key}
              type="button"
              onClick={() => onAction(key)}
              className="group flex items-center gap-2.5 rounded-xl border border-neutral-200 px-3 py-2.5 text-left text-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
            >
              <Icon className="h-4 w-4 shrink-0 text-neutral-400 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
              <span className="truncate text-neutral-700 dark:text-neutral-300">{label}</span>
              {!real && <span className="ml-auto shrink-0 text-[10px] text-neutral-400">em breve</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }
);
