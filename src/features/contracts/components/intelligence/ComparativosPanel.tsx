import { Scale } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { MetricComparisonCard } from '@/shared/components/intelligence/MetricComparisonCard';
import { formatMoeda } from '@/shared/lib/format';
import type { ComparativoResult } from '../../intelligence/types';

function formatValor(valor: number, unidade: string) {
  if (unidade === 'R$') return formatMoeda(valor);
  return `${Math.round(valor)} ${unidade}`;
}

export function ComparativosPanel({ resultado }: { resultado: ComparativoResult }) {
  if (resultado.itens.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title="Sem base de comparação ainda"
        description="Precisa de pelo menos mais um contrato com a mesma periodicidade para calcular uma média."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-baseline justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <Scale className="h-3.5 w-3.5" />
          Comparativo com outros contratos
        </h3>
        <span className="text-[11px] text-neutral-400">
          {resultado.amostraGrupo} {resultado.amostraGrupo === 1 ? 'outro contrato' : 'outros contratos'}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {resultado.itens.map((item) => (
          <MetricComparisonCard key={item.label} item={item} formatValor={formatValor} />
        ))}
      </div>
    </div>
  );
}
