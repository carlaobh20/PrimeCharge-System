import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

// Empty state elegante, padrão único reutilizado por toda aba/seção do Cockpit do Ativo
// que ainda não tem dado real por trás (Sprint 2, DEC-021) — nunca uma tela em branco.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'animate-cockpit-fade-in flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 px-6 py-14 text-center dark:border-white/10',
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 dark:bg-white/5">
        <Icon className="h-5 w-5 text-neutral-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{title}</p>
        <p className="max-w-sm text-xs text-neutral-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
