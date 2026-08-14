import { TrendingUp } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { OpportunityCard } from '@/shared/components/intelligence/OpportunityCard';
import type { PrioritizedOpportunity } from '../types';

export function OportunidadesWidget({ oportunidades }: { oportunidades: PrioritizedOpportunity[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <TrendingUp className="h-3.5 w-3.5" />
        Oportunidades
      </h2>
      {oportunidades.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nenhuma oportunidade identificada"
          description="Hoje o Command Center avalia só valorização patrimonial — mais regras entram conforme novos módulos alimentarem a plataforma."
          className="mt-3"
        />
      ) : (
        <ul className="mt-3 space-y-1.5">
          {oportunidades.map((oportunidade) => (
            <li key={oportunidade.id}>
              <OpportunityCard oportunidade={oportunidade} href={oportunidade.href} />
              <span className="mt-0.5 block text-[11px] text-neutral-400">{oportunidade.origemLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
