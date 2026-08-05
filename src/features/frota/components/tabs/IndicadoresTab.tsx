import { HealthScoreCard } from '@/shared/components/intelligence/HealthScoreCard';
import { InsightsPanel } from '../intelligence/InsightsPanel';
import { AlertasPanel } from '../intelligence/AlertasPanel';
import { ProximasAcoesPanel } from '../intelligence/ProximasAcoesPanel';
import { ComparativosPanel } from '../intelligence/ComparativosPanel';
import type { UseVehicleIntelligenceResult } from '../../hooks/useVehicleIntelligence';
import type { ActionKey } from '../../lib/actions';

function IndicadoresSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-48 cockpit-shimmer rounded-2xl" />
      ))}
    </div>
  );
}

// Componente burro de propósito: só compõe os painéis com o resultado já calculado por
// useVehicleIntelligence (chamado uma vez em VeiculoDetailPage e repassado por prop) —
// nenhum cálculo de score/insight/alerta acontece aqui nem em nenhuma outra página.
export function IndicadoresTab({
  resultado,
  veiculoId,
  onAction,
}: {
  resultado: UseVehicleIntelligenceResult;
  veiculoId: string;
  onAction: (key: ActionKey) => void;
}) {
  if (resultado.isLoading) return <IndicadoresSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <HealthScoreCard resultado={resultado.healthScore} />
      <ComparativosPanel resultado={resultado.comparativos} />
      <InsightsPanel insights={resultado.insights} />
      <AlertasPanel alertas={resultado.alertas} />
      <div className="lg:col-span-2">
        <ProximasAcoesPanel acoes={resultado.proximasAcoes} veiculoId={veiculoId} onAction={onAction} />
      </div>
    </div>
  );
}
