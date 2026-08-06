import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/components/ui/badge';
import { NIVEL_PRIME_DRIVER_LABEL, type DriverScoreResult, type NivelPrimeDriver } from '../../intelligence/driverScore';

const NIVEL_BADGE: Record<NivelPrimeDriver, 'secondary' | 'info' | 'warning' | 'success'> = {
  bronze: 'secondary',
  prata: 'info',
  ouro: 'warning',
  black: 'success',
};

// Fica em features/motoristas/ (não shared/), diferente de HealthScoreCard — a estrutura de
// sinais do Driver Score é própria deste domínio, sem um segundo consumidor ainda que
// justifique generalizar (regra dos 3, mesmo racional de DEC-010). Ver PRIME_DRIVER_PROGRAM.md
// para o vocabulário completo (Driver Score ≠ Health Score, seção 2).
export function DriverScoreCard({ driverScore, nivel }: { driverScore: DriverScoreResult; nivel: NivelPrimeDriver }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Driver Score · Prime Driver</h3>
        <Badge variant={NIVEL_BADGE[nivel]}>{NIVEL_PRIME_DRIVER_LABEL[nivel]}</Badge>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-semibold text-neutral-900 dark:text-neutral-100">{driverScore.overall ?? '—'}</span>
        {driverScore.overall !== null && <span className="pb-1 text-sm text-neutral-400">/ 100</span>}
        <span className="pb-1 text-[11px] text-neutral-400">
          {driverScore.sinaisAvaliados} de {driverScore.sinaisTotais} sinais avaliados
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {driverScore.sinais.map((sinal) => (
          <li key={sinal.id}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600 dark:text-neutral-300">{sinal.label}</span>
              <span className={cn('font-medium', sinal.score !== null ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400')}>
                {sinal.score !== null ? sinal.score : 'sem dado'}
              </span>
            </div>
            {sinal.score !== null && (
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${sinal.score}%` }} />
              </div>
            )}
            <p className="mt-1 text-[11px] leading-snug text-neutral-400">{sinal.motivo}</p>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-neutral-100 pt-2 text-[11px] text-neutral-400 dark:border-white/5">
        Prata: 6 meses contínuo ativo sem alerta crítico · Ouro: 12 meses + sem cancelamento/atraso · Black: 24 meses (PRIME_DRIVER_PROGRAM.md §4).
      </p>
    </div>
  );
}
