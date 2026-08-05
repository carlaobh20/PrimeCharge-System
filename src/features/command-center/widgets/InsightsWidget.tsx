import { Lightbulb } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { InsightCard } from '@/shared/components/intelligence/InsightCard';
import type { PrioritizedInsight } from '../types';

export function InsightsWidget({ insights }: { insights: PrioritizedInsight[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <Lightbulb className="h-3.5 w-3.5" />
        Insights
      </h2>
      {insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Nenhum insight ainda"
          description="Conforme a operação acumular dado, observações neutras sobre cada veículo, motorista e contrato aparecem aqui."
          className="mt-3"
        />
      ) : (
        <ul className="mt-3 space-y-2">
          {insights.map((insight) => (
            <li key={insight.id}>
              <InsightCard insight={insight} />
              <span className="mt-0.5 block text-[11px] text-neutral-400">{insight.origemLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
