import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Button } from '@/shared/components/ui/button';

export function IndicadoresTab({ onVerKpis }: { onVerKpis: () => void }) {
  return (
    <EmptyState
      icon={BarChart3}
      title="Indicadores detalhados ainda não existem"
      description="Esta aba vai trazer gráficos de evolução (km ao longo do tempo, custo por período, disponibilidade) quando houver dado histórico suficiente. Os indicadores atuais já estão na faixa de KPIs, no topo da página."
      action={
        <Button type="button" variant="outline" size="sm" onClick={onVerKpis}>
          Ver KPIs atuais
        </Button>
      }
    />
  );
}
