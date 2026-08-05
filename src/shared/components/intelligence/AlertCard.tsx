import { cn } from '@/shared/lib/utils';
import type { Alerta } from '@/shared/intelligence/types';

const BADGE_COLOR: Record<Alerta['severidade'], string> = {
  atencao: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
  critico: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300',
};

// Card genérico de um único alerta. Sem `<ul>`/`<li>` embutido — quem compõe decide o wrapper.
export function AlertCard({ alerta }: { alerta: Alerta }) {
  return (
    <div className={cn('rounded-lg border px-2.5 py-1.5 text-xs', BADGE_COLOR[alerta.severidade])}>{alerta.texto}</div>
  );
}
