import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useMotoristas, useMoverEtapaFunil } from '../hooks/useMotoristas';
import { agruparPorEtapa, calcularMetricasFunil } from '../intelligence/funilMetrics';
import { MOTORISTA_ETAPA_FUNIL_ORDEM, type MotoristaEtapaFunil } from '../types';
import { FunilColuna } from '../components/crm/FunilColuna';
import { MotoristaCrmCard } from '../components/crm/MotoristaCrmCard';
import { MetricasFunilPanel } from '../components/crm/MetricasFunilPanel';
import { MotoristaCrmDrawer } from '../components/crm/MotoristaCrmDrawer';

// Épico 6 — CRM PrimeCharge / Jornada do Motorista, Fase 1. Kanban com as 14 colunas do
// funil, drag-and-drop (dnd-kit, biblioteca nova — não existia nenhuma no projeto) e painel
// lateral ao clicar num cartão. Motoristas com etapa_funil null (cadastrados antes da
// migration 0025) aparecem numa faixa "Não classificado" no topo — nunca escondidos, nunca
// jogados numa coluna arbitrária.
export function MotoristasCrmPage() {
  const { data: motoristas, isLoading } = useMotoristas();
  const moverEtapa = useMoverEtapaFunil();
  const [motoristaAbertoId, setMotoristaAbertoId] = useState<string | null>(null);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 cockpit-shimmer rounded-2xl" />
        <div className="flex gap-3 overflow-x-auto">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-96 w-72 shrink-0 cockpit-shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const lista = motoristas ?? [];
  const { colunas, naoClassificados } = agruparPorEtapa(lista);
  const metricas = calcularMetricasFunil(lista);
  const arrastando = arrastandoId ? lista.find((m) => m.id === arrastandoId) : null;

  function handleDragStart(event: DragStartEvent) {
    setArrastandoId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setArrastandoId(null);
    const { active, over } = event;
    if (!over) return;
    const novaEtapa = over.id as MotoristaEtapaFunil;
    if (!MOTORISTA_ETAPA_FUNIL_ORDEM.includes(novaEtapa)) return;
    const motorista = lista.find((m) => m.id === active.id);
    if (!motorista || motorista.etapa_funil === novaEtapa) return;
    moverEtapa.mutate({ id: motorista.id, etapaFunil: novaEtapa });
  }

  return (
    <div className="space-y-4">
      <MetricasFunilPanel metricas={metricas} />

      {/* Achado ao validar em produção com Carlos: os cartões de "Não classificados" tinham
          ficado FORA do DndContext (só as 14 colunas estavam dentro) — useDraggable sem um
          DndContext ancestral simplesmente não responde a nada. Como praticamente todo motorista
          real (cadastrado antes da migration 0025) cai nessa faixa, na prática NENHUM cartão
          arrastava. Corrigido: DndContext agora envolve a faixa inteira, não só as colunas. */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {naoClassificados.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Não classificados ({naoClassificados.length}) — cadastrados antes do Kanban, arraste pra uma coluna
            </p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {naoClassificados.map((m) => (
                <div key={m.id} className="w-48 shrink-0">
                  <MotoristaCrmCard motorista={m} onClick={() => setMotoristaAbertoId(m.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-3 overflow-x-auto pb-4">
          {colunas.map((coluna) => (
            <FunilColuna key={coluna.etapa} etapa={coluna.etapa} motoristas={coluna.motoristas} onAbrirMotorista={setMotoristaAbertoId} />
          ))}
        </div>
        <DragOverlay>{arrastando && <MotoristaCrmCard motorista={arrastando} onClick={() => {}} />}</DragOverlay>
      </DndContext>

      <MotoristaCrmDrawer motoristaId={motoristaAbertoId} onOpenChange={(open) => !open && setMotoristaAbertoId(null)} />
    </div>
  );
}
