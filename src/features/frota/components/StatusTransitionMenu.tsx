import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { VEICULO_STATUS_LABEL, VEICULO_STATUS_TRANSITIONS, type VeiculoStatus } from '../types';

export function StatusTransitionMenu({
  status,
  onTransition,
  disabled,
}: {
  status: VeiculoStatus;
  onTransition: (next: VeiculoStatus) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const proximos = VEICULO_STATUS_TRANSITIONS[status];

  if (proximos.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)} disabled={disabled}>
        Alterar status
        <ChevronDown className="h-4 w-4" />
      </Button>
      {open && (
        <div
          className={cn(
            'absolute right-0 z-10 mt-1 w-48 rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900'
          )}
        >
          {proximos.map((next) => (
            <button
              key={next}
              type="button"
              onClick={() => {
                onTransition(next);
                setOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {VEICULO_STATUS_LABEL[next]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
