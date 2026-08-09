import { Tabs } from '@/shared/components/ui/tabs';
import { CapitalAllocationCenter } from '../components/CapitalAllocationCenter';
import { PoliticasForm } from '../components/PoliticasForm';
import { MasterPlanForm } from '../components/MasterPlanForm';
import { GrowthTimeline } from '../components/GrowthTimeline';
import { RoadmapAutomatico } from '../components/RoadmapAutomatico';
import { SimulacaoEmpresarial } from '../components/SimulacaoEmpresarial';

// Épico 3 — "Central de Decisão Empresarial" (reconstrução completa, 2026-08-09): deixou de ser
// um formulário com botão Simular — agora é um dashboard interativo, tudo recalcula em tempo
// real. Continua sendo a primeira aba (porta de entrada do módulo, antes de qualquer gráfico/KPI
// de dado real). As abas com dado real (Planejamento Mestre, Capital Allocation Center,
// Políticas) continuam existindo, só vêm depois — nada foi apagado, só reordenado. Ver relatório
// da sessão pra racional completo.
export function CentroDeEstrategiaPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Centro de Estratégia</h1>
        <p className="mt-1 text-sm text-neutral-500">
          A central de decisão financeira da PrimeCharge — e as regras que toda decisão futura deve respeitar.
        </p>
      </div>

      <Tabs
        defaultValue="simulacao"
        items={[
          { value: 'simulacao', label: 'Central de Decisão', content: <SimulacaoEmpresarial /> },
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
