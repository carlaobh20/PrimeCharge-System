import { useTimeline } from '../hooks/useTimeline';

function formatData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

export function TimelinePanel({ entidadeTipo, entidadeId }: { entidadeTipo: string; entidadeId: string }) {
  const { data: eventos, isLoading } = useTimeline(entidadeTipo, entidadeId);

  if (isLoading) return <p className="text-sm text-neutral-500">Carregando timeline…</p>;
  if (!eventos || eventos.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhum evento registrado ainda.</p>;
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
