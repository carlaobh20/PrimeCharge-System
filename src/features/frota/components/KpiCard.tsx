import type { ComponentType } from 'react';
import { cn } from '@/shared/lib/utils';

// Card de KPI do Cockpit do Ativo. Fica local a features/frota — CORE_CONCEPTS/DEC-008 pedem
// não generalizar pra shared/ até um segundo módulo precisar do mesmo padrão (regra dos 3).
export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  pending,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  /** true = KPI ainda sem módulo de negócio por trás (Financeiro/Manutenção/Contratos) — mostrado como "Em breve". */
  pending?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-w-[168px] flex-1 flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]',
        pending && 'opacity-70'
      )}
    >
      <div className="flex items-center gap-2 text-neutral-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      {pending ? (
        <span className="text-xs font-medium text-neutral-400">Em breve</span>
      ) : (
        <span className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</span>
      )}
      {hint && !pending && <span className="text-[11px] text-neutral-400">{hint}</span>}
    </div>
  );
}
