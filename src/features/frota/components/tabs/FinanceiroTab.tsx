import { Wallet } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Button } from '@/shared/components/ui/button';
import type { ActionKey } from '../../lib/actions';

export function FinanceiroTab({ onAction }: { onAction: (key: ActionKey) => void }) {
  return (
    <EmptyState
      icon={Wallet}
      title="Financeiro ainda não está conectado a este veículo"
      description="Receita, custo, lucro e ROI vão aparecer aqui assim que o módulo Financeiro/Contratos existir — os KPIs no topo já estão prontos pra receber esse dado, só falta a fonte."
      action={
        <Button type="button" variant="outline" size="sm" onClick={() => onAction('relatorio')}>
          Gerar relatório
        </Button>
      }
    />
  );
}
