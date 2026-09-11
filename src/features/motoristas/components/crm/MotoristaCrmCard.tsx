import { useDraggable } from '@dnd-kit/core';
import { Star } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { diasNaEtapa } from '../../intelligence/funilMetrics';
import { MOTORISTA_PRIORIDADE_COLOR, MOTORISTA_PRIORIDADE_LABEL, type Motorista } from '../../types';

// Mesma função de MotoristaCockpitHeader.tsx (2º consumidor — "regra dos 3": só promove pra
// shared/ quando aparecer um 3º, mesmo padrão já usado no resto do projeto).
function iniciais(nomeCompleto: string) {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

// Épico 6 — CRM, Fase 1. "Score RodaVolt" e "Veículo reservado" do brief NÃO entram no
// cartão ainda: score composto (Etapa 3) e reserva de veículo por lead são Fase 2+ — mostrar
// aqui agora seria ou inventar número ou linkar um conceito que ainda não existe no schema.
export function MotoristaCrmCard({ motorista, onClick }: { motorista: Motorista; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: motorista.id });
  const dias = diasNaEtapa(motorista);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`cursor-grab rounded-lg border border-neutral-200 bg-white p-2 text-left shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing dark:border-white/10 dark:bg-neutral-900 ${isDragging ? 'z-10 opacity-70 shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-1.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
          {iniciais(motorista.nome_completo)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">{motorista.nome_completo}</p>
          <p className="truncate text-[10px] text-neutral-500">{motorista.telefone ?? 'Sem telefone'}</p>
        </div>
        {motorista.prioridade !== 'media' && (
          <Star
            className={`h-3 w-3 shrink-0 ${motorista.prioridade === 'critica' ? 'fill-red-500 text-red-500' : motorista.prioridade === 'alta' ? 'fill-amber-500 text-amber-500' : 'text-neutral-300'}`}
          />
        )}
      </div>

      {(motorista.cidade || motorista.prioridade !== 'media') && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {motorista.cidade && (
            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
              {motorista.cidade}
            </span>
          )}
          {motorista.prioridade !== 'media' && (
            <Badge variant={MOTORISTA_PRIORIDADE_COLOR[motorista.prioridade]} className="px-1.5 py-0 text-[9px]">
              {MOTORISTA_PRIORIDADE_LABEL[motorista.prioridade]}
            </Badge>
          )}
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between text-[9px] text-neutral-400">
        <span>{dias !== null ? `${dias} dia(s) na etapa` : '—'}</span>
      </div>
    </div>
  );
}
