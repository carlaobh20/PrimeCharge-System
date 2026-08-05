import { cn } from '@/shared/lib/utils';
import type { HealthScoreResult, HealthStatus } from '@/shared/intelligence/types';

const STATUS_COLOR: Record<HealthStatus, string> = {
  ok: 'bg-emerald-500',
  atencao: 'bg-amber-500',
  critico: 'bg-red-500',
  sem_dado: 'bg-neutral-300 dark:bg-neutral-700',
};

const STATUS_TEXT: Record<HealthStatus, string> = {
  ok: 'text-emerald-700 dark:text-emerald-400',
  atencao: 'text-amber-700 dark:text-amber-400',
  critico: 'text-red-700 dark:text-red-400',
  sem_dado: 'text-neutral-400',
};

// Card reutilizável (Sprint 3 → componentizado na Sprint 4, ver DEC-023): recebe o
// resultado já calculado por um hook de bridge tipo useVehicleIntelligence — nenhuma
// lógica aqui. Vive em shared/ de propósito, pra poder ser usado por qualquer feature
// futura (Motoristas, Contratos...) que produza um HealthScoreResult, e pelo futuro
// Dashboard/Command Center.
export function HealthScoreCard({ resultado }: { resultado: HealthScoreResult }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Health Score</h3>
        <span className="text-[11px] text-neutral-400">
          {resultado.categoriasAvaliadas} de {resultado.categoriasTotais} categorias avaliadas
        </span>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-semibold text-neutral-900 dark:text-neutral-100">
          {resultado.overall ?? '—'}
        </span>
        {resultado.overall !== null && <span className="pb-1 text-sm text-neutral-400">/ 100</span>}
      </div>

      <ul className="mt-4 space-y-2.5">
        {resultado.categorias.map((cat) => (
          <li key={cat.categoria} className="group relative">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_COLOR[cat.status])} />
                {cat.label}
              </span>
              <span className={cn('font-medium', STATUS_TEXT[cat.status])}>
                {cat.score !== null ? cat.score : 'sem dado'}
              </span>
            </div>
            {cat.score !== null && (
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                <div className={cn('h-full rounded-full', STATUS_COLOR[cat.status])} style={{ width: `${cat.score}%` }} />
              </div>
            )}
            <p className="mt-1 text-[11px] leading-snug text-neutral-400">{cat.motivos.join(' ')}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
