import { useDroppable } from '@dnd-kit/core';
import type { FunilEtapa, Motorista } from '../../types';
import { MotoristaCrmCard } from './MotoristaCrmCard';

// Épico 6, Fase 1.1 — `etapa` agora é o objeto FunilEtapa inteiro (dado editável, migration
// 0026), não mais um valor de enum. O id droppable do dnd-kit passa a ser o uuid da etapa.
export function FunilColuna({
  etapa,
  motoristas,
  onAbrirMotorista,
}: {
  etapa: FunilEtapa;
  motoristas: Motorista[];
  onAbrirMotorista: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-48 shrink-0 flex-col rounded-xl border p-2 transition-colors ${
        isOver ? 'border-emerald-400 bg-emerald-50/60 dark:border-emerald-500/50 dark:bg-emerald-950/20' : 'border-neutral-200 bg-neutral-50/60 dark:border-white/10 dark:bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center justify-between px-1 py-1">
        <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-neutral-500">{etapa.nome}</h3>
        <span className="shrink-0 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
          {motoristas.length}
        </span>
      </div>
      <div className="mt-1 flex min-h-[60px] flex-col gap-2">
        {motoristas.map((m) => (
          <MotoristaCrmCard key={m.id} motorista={m} onClick={() => onAbrirMotorista(m.id)} />
        ))}
      </div>
    </div>
  );
}
