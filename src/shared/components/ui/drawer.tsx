import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// Épico 6 — CRM Motoristas, Fase 1. Primeiro painel lateral (slide-over) do app — até aqui
// todo "abrir detalhe" era página cheia (VeiculoDetailPage, MotoristaDetailPage,
// ContratoDetailPage). Reaproveita o MESMO padrão do Dialog (Tailwind-only, sem dependência
// nova, Escape/clique-fora fecha) — só troca posição central por lateral direita e a animação
// de scale por slide. Vive em shared/ (não motoristas/) porque não há nada específico de
// motorista aqui — qualquer outra feature que precisar de painel lateral reaproveita este
// componente em vez de duplicar.
export function Drawer({
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-cockpit-fade-in bg-neutral-950/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={cn(
          'relative flex h-full w-full max-w-2xl animate-cockpit-slide-in-right flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 p-5 dark:border-white/5">
          <div>
            <h2 id="drawer-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
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
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
