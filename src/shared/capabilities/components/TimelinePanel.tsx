import { History } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { useTimeline } from '../hooks/useTimeline';

function formatData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

export function TimelinePanel({ entidadeTipo, entidadeId }: { entidadeTipo: string; entidadeId: string }) {
  const { data: eventos, isLoading } = useTimeline(entidadeTipo, entidadeId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />
        ))}
      </div>
    );
  }
  if (!eventos || eventos.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nenhum evento registrado ainda"
        description="Mudanças de status e outros marcos deste registro aparecem aqui automaticamente."
      />
    );
  }

  return (
    <ol className="space-y-3 border-l border-neutral-200 pl-4 dark:border-neutral-800">
      {eventos.map((evento) => (
        <li key={evento.id} className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <p className="text-sm text-neutral-800 dark:text-neutral-200">{evento.descricao}</p>
          <p className="text-xs text-neutral-500">{formatData(evento.criado_em)}</p>
        </li>
      ))}
    </ol>
  );
}
