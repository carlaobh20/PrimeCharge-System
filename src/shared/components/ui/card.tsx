import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // min-w-0: Card é sempre item de grid/flex em algum lugar (Central de Decisão empilha
        // vários lado a lado) — sem isso, um filho largo (gráfico Recharts, linha do tempo
        // horizontal) estoura o card e empurra a página inteira pro lado (DEC: Central de
        // Decisão Empresarial, Fase 2/3, 2026-08-09).
        'min-w-0 rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold text-neutral-900 dark:text-neutral-100', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-0', className)} {...props} />;
}
