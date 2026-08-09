import { Tabs } from '@/shared/components/ui/tabs';
import { CapitalAllocationCenter } from '../components/CapitalAllocationCenter';
import { PoliticasForm } from '../components/PoliticasForm';
import { MasterPlanForm } from '../components/MasterPlanForm';
import { GrowthTimeline } from '../components/GrowthTimeline';
import { RoadmapAutomatico } from '../components/RoadmapAutomatico';

// Épico 2 — Centro de Estratégia, Fase 2 ("Capital Allocation Center", ajuste de escopo
// pedido pelo Carlos em cima da Fase 1/Foundation). Duas abas nesta fase: o painel principal
// (Capital Allocation Center — ROI/capital real por veículo, ver components/) e Políticas da
// Empresa (as regras que toda recomendação futura vai respeitar). Comitê de Investimentos e
// Backtest ficam para as próximas fases — Backtest em especial só produz valor real depois que
// existir histórico de decisões registradas (ver relatório da Fase 2 no projeto), construir a
// tela agora seria ela ficar vazia por definição.
export function CentroDeEstrategiaPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Centro de Estratégia</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Onde o próximo real investido pela empresa gera mais retorno — e as regras que toda recomendação futura
          deve respeitar.
        </p>
      </div>

      <Tabs
        defaultValue="master-plan"
        items={[
          {
            value: 'master-plan',
            label: 'Planejamento Mestre',
            content: (
              <div className="space-y-6">
                <MasterPlanForm />
                <RoadmapAutomatico />
                <GrowthTimeline />
              </div>
            ),
          },
          { value: 'capital', label: 'Capital Allocation Center', content: <CapitalAllocationCenter /> },
          { value: 'politicas', label: 'Políticas', content: <PoliticasForm /> },
        ]}
      />
    </div>
  );
}
