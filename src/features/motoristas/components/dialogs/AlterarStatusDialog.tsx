import { Dialog } from '@/shared/components/ui/dialog';
import { StatusBadge } from '../StatusBadge';
import { MOTORISTA_STATUS_LABEL, MOTORISTA_STATUS_TRANSITIONS, type MotoristaStatus } from '../../types';

export function AlterarStatusDialog({
  open,
  onOpenChange,
  status,
  onTransition,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: MotoristaStatus;
  onTransition: (next: MotoristaStatus) => void;
  disabled?: boolean;
}) {
  const proximos = MOTORISTA_STATUS_TRANSITIONS[status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Alterar status">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        Status atual: <StatusBadge status={status} />
      </div>
      {proximos.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">Este é um status final — não há transição disponível.</p>
      ) : (
        <div className="mt-4 space-y-1.5">
          {proximos.map((next) => (
            <button
              key={next}
              type="button"
              disabled={disabled}
              onClick={() => {
                onTransition(next);
                onOpenChange(false);
              }}
              className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm transition-colors hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50 dark:border-white/10 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/30"
            >
              <span className="text-neutral-700 dark:text-neutral-300">Mover para</span>
              <StatusBadge status={next} />
            </button>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-neutral-400">
        {MOTORISTA_STATUS_LABEL[status]} só pode avançar para os status acima — transições seguem a state machine de{' '}
        <code className="rounded bg-neutral-100 px-1 dark:bg-white/10">CORE_CONCEPTS.md</code>.
      </p>
    </Dialog>
  );
}
