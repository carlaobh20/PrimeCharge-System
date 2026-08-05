import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// Dialog mínimo, Tailwind-only (sem dependência nova) — padrão único reutilizado por
// todos os Command Actions do Cockpit do Ativo (Sprint 2). Fecha com Escape ou clique fora.
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-cockpit-fade-in bg-neutral-950/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          'relative w-full max-w-md animate-cockpit-scale-in rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-neutral-900',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </h2>
            {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
