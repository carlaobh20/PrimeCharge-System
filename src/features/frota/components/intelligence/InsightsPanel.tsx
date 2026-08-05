import { Lightbulb } from 'lucide-react';
import { InsightCard } from '@/shared/components/intelligence/InsightCard';
import type { Insight } from '../../intelligence/types';

// Painel específico do Cockpit do Ativo: título, ícone e layout são do módulo Veículos —
// o item de verdade (InsightCard) é o pedaço reutilizável (ver DEC-023).
export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <Lightbulb className="h-3.5 w-3.5" />
        Insights
      </h3>
      <ul className="mt-3 space-y-2">
        {insights.map((insight) => (
          <li key={insight.id}>
            <InsightCard insight={insight} />
          </li>
        ))}
      </ul>
    </div>
  );
}
