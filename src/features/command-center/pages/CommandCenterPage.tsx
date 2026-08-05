import { useCommandCenter } from '../hooks/useCommandCenter';
import { PrioridadesDoDiaWidget } from '../widgets/PrioridadesDoDiaWidget';
import { AlertasWidget } from '../widgets/AlertasWidget';
import { OportunidadesWidget } from '../widgets/OportunidadesWidget';
import { RiscosWidget } from '../widgets/RiscosWidget';
import { ProximasAcoesWidget } from '../widgets/ProximasAcoesWidget';
import { InsightsWidget } from '../widgets/InsightsWidget';
import { ResumoFrotaWidget } from '../widgets/ResumoFrotaWidget';
import { VeiculosListWidget } from '../widgets/VeiculosListWidget';
import { AcoesOperacionaisWidget } from '../widgets/AcoesOperacionaisWidget';

function CommandCenterSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-56 cockpit-shimmer rounded-2xl" />
      ))}
    </div>
  );
}

// Home do sistema desde a Sprint 5 — substitui o Dashboard como primeira tela após login
// (DEC-024: Command Center é o centro de decisão operacional; Dashboard vira exclusivamente
// analítico, em /dashboard). Componente burro de propósito: todo o cálculo vem pronto de
// useCommandCenter, que por sua vez só orquestra os Engines — nenhuma regra mora aqui.
export function CommandCenterPage() {
  const resultado = useCommandCenter();

  if (resultado.isLoading) return <CommandCenterSkeleton />;

  const { alertas, insights, acoes, oportunidades, riscos, resumoFrota, prioridadesDoDia } = resultado;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Central de Comando</h1>
        <p className="mt-1 text-sm text-neutral-500">
          O que aconteceu, o que é importante, e o que precisa ser feito agora — em toda a operação (veículos,
          motoristas e contratos).
        </p>
      </div>

      <PrioridadesDoDiaWidget itens={prioridadesDoDia} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AcoesOperacionaisWidget />
        <AlertasWidget alertas={alertas} />
        <OportunidadesWidget oportunidades={oportunidades} />
        <RiscosWidget riscos={riscos} />
        <ProximasAcoesWidget acoes={acoes} />
        <InsightsWidget insights={insights} />
        <ResumoFrotaWidget resumo={resumoFrota} />
        <VeiculosListWidget tom="critico" itens={resumoFrota.veiculosCriticos} />
        <VeiculosListWidget tom="destaque" itens={resumoFrota.veiculosDestaque} />
      </div>
    </div>
  );
}
