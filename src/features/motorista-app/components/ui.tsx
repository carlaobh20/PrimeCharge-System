import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

// Primitivas visuais compartilhadas pelo portal do motorista — cards limpos, pills de status,
// e estados (loading/empty/error) consistentes. Mobile-first: alvos de toque generosos,
// tipografia legível, hierarquia forte.

export function Secao({ titulo, acao, children, className }: { titulo?: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]', className)}>
      {(titulo || acao) && (
        <div className="mb-2 flex items-center justify-between">
          {titulo && <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{titulo}</h2>}
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

export function Linha({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 py-2', className)}>
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-right text-sm font-medium text-neutral-900 dark:text-neutral-100">{value}</span>
    </div>
  );
}

type Tom = 'verde' | 'ambar' | 'vermelho' | 'neutro' | 'azul';
const TOM: Record<Tom, string> = {
  verde: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  ambar: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  vermelho: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  neutro: 'bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300',
  azul: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
};

export function Pill({ tom, children }: { tom: Tom; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', TOM[tom])}>{children}</span>;
}

export function SkeletonPortal() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" />
      <div className="h-40 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" />
    </div>
  );
}

export function ErroPortal({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-500/20 dark:bg-red-500/10">
      <p className="text-sm text-red-700 dark:text-red-300">Não foi possível carregar agora. Verifique sua conexão.</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-sm font-medium text-red-700 underline dark:text-red-300">
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function VazioPortal({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 p-6 text-center dark:border-white/10">
      <p className="text-sm text-neutral-500">{children}</p>
    </div>
  );
}
