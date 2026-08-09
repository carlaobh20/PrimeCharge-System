import { Tabs } from '@/shared/components/ui/tabs';
import { CapitalAllocationCenter } from '../components/CapitalAllocationCenter';
import { PoliticasForm } from '../components/PoliticasForm';
import { MasterPlanForm } from '../components/MasterPlanForm';
import { GrowthTimeline } from '../components/GrowthTimeline';
import { RoadmapAutomatico } from '../components/RoadmapAutomatico';
import { SimulacaoEmpresarial } from '../components/SimulacaoEmpresarial';

// Épico 3 — reordenado a pedido do Carlos (2026-08-09): "Simulação" (a história do crescimento,
// contada em cenário hipotético) virou a PRIMEIRA aba — porta de entrada do módulo, antes de
// qualquer gráfico/KPI/dado real. As abas com dado real (Planejamento Mestre, Capital Allocation
// Center, Políticas) continuam existindo, só passam a vir depois — nada foi apagado, só
// reordenado. Ver relatório da sessão pra racional completo de "por que simulação primeiro".
export function CentroDeEstrategiaPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Centro de Estratégia</h1>
        <p className="mt-1 text-sm text-neutral-500">
          A história do crescimento da PrimeCharge — e as regras que toda decisão futura deve respeitar.
        </p>
      </div>

      <Tabs
        defaultValue="simulacao"
        items={[
          { value: 'simulacao', label: 'Simulação Empresarial', content: <SimulacaoEmpresarial /> },
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
