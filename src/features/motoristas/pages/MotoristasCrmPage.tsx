import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { Button } from '@/shared/components/ui/button';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useMotoristas, useMoverEtapaFunil } from '../hooks/useMotoristas';
import { useFunilEtapas } from '../hooks/useFunilEtapas';
import { agruparPorEtapa, calcularMetricasFunil } from '../intelligence/funilMetrics';
import { FunilColuna } from '../components/crm/FunilColuna';
import { MotoristaCrmCard } from '../components/crm/MotoristaCrmCard';
import { MetricasFunilPanel } from '../components/crm/MetricasFunilPanel';
import { MotoristaCrmDrawer } from '../components/crm/MotoristaCrmDrawer';
import { GerenciarFunilDialog } from '../components/crm/GerenciarFunilDialog';

// Épico 6 — CRM PrimeCharge / Jornada do Motorista, Fase 1 (+ Fase 1.1: etapas editáveis,
// migration 0026). Kanban com as colunas do funil (agora dado, não enum fixo — Carlos pode
// adicionar/remover etapa pela tela via "Gerenciar etapas"), drag-and-drop (dnd-kit) e painel
// lateral ao clicar num cartão. Motoristas com etapa_funil_id null (cadastrados antes da
// migration 0025, ou cuja etapa foi arquivada) aparecem numa faixa "Não classificado" no topo
// — nunca escondidos, nunca jogados numa coluna arbitrária.
export function MotoristasCrmPage() {
  const { data: usuario } = useCurrentUsuario();
  const { data: motoristas, isLoading: carregandoMotoristas } = useMotoristas();
  const { data: etapas, isLoading: carregandoEtapas } = useFunilEtapas(usuario?.empresa_id ?? undefined);
  const moverEtapa = useMoverEtapaFunil();
  const [motoristaAbertoId, setMotoristaAbertoId] = useState<string | null>(null);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [gerenciarAberto, setGerenciarAberto] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const isLoading = carregandoMotoristas || carregandoEtapas;

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
  const listaEtapas = etapas ?? [];
  const { colunas, naoClassificados } = agruparPorEtapa(lista, listaEtapas);
  const metricas = calcularMetricasFunil(lista, listaEtapas);
  const arrastando = arrastandoId ? lista.find((m) => m.id === arrastandoId) : null;
  const idsEtapasValidas = new Set(listaEtapas.map((e) => e.id));

  function handleDragStart(event: DragStartEvent) {
    setArrastandoId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setArrastandoId(null);
    const { active, over } = event;
    if (!over) return;
    const novaEtapaId = String(over.id);
    if (!idsEtapasValidas.has(novaEtapaId)) return;
    const motorista = lista.find((m) => m.id === active.id);
    if (!motorista || motorista.etapa_funil_id === novaEtapaId) return;
    moverEtapa.mutate({ id: motorista.id, etapaFunilId: novaEtapaId });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <MetricasFunilPanel metricas={metricas} />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setGerenciarAberto(true)}>
          <Settings2 className="h-3.5 w-3.5" />
          Gerenciar etapas
        </Button>
      </div>

      {/* Achado ao validar em produção com Carlos: os cartões de "Não classificados" tinham
          ficado FORA do DndContext (só as colunas estavam dentro) — useDraggable sem um
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
            <FunilColuna key={coluna.etapa.id} etapa={coluna.etapa} motoristas={coluna.motoristas} onAbrirMotorista={setMotoristaAbertoId} />
          ))}
          {listaEtapas.length === 0 && (
            <p className="py-6 text-sm text-neutral-500">
              Nenhuma etapa configurada ainda. Use "Gerenciar etapas" pra criar a primeira coluna do Kanban.
            </p>
          )}
        </div>
        <DragOverlay>{arrastando && <MotoristaCrmCard motorista={arrastando} onClick={() => {}} />}</DragOverlay>
      </DndContext>

      <MotoristaCrmDrawer motoristaId={motoristaAbertoId} onOpenChange={(open) => !open && setMotoristaAbertoId(null)} />

      <GerenciarFunilDialog
        open={gerenciarAberto}
        onOpenChange={setGerenciarAberto}
        empresaId={usuario?.empresa_id ?? undefined}
        etapas={listaEtapas}
        motoristas={lista}
      />
    </div>
  );
}
