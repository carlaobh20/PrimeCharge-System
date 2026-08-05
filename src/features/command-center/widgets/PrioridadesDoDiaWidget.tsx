import { Flame } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { PriorityFeedItemCard } from '../cards/PriorityFeedItemCard';
import type { CommandCenterFeedItem } from '../types';

export function PrioridadesDoDiaWidget({ itens }: { itens: CommandCenterFeedItem[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <Flame className="h-3.5 w-3.5" />
        Prioridades do Dia
      </h2>
      {itens.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="Nada urgente agora"
          description="Quando algo pedir atenção prioritária em qualquer veículo, motorista ou contrato, aparece aqui primeiro."
          className="mt-3"
        />
      ) : (
        <div className="mt-3 space-y-2">
          {itens.map((item) => (
            <PriorityFeedItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
