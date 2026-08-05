import { Settings } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Button } from '@/shared/components/ui/button';
import type { ActionKey } from '../../lib/actions';

export function ConfiguracoesTab({ onAction }: { onAction: (key: ActionKey) => void }) {
  return (
    <EmptyState
      icon={Settings}
      title="Nenhuma configuração específica ainda"
      description="Preferências deste veículo (notificações de vencimento de documento, responsável padrão, arquivamento) vão morar aqui."
      action={
        <Button type="button" variant="outline" size="sm" onClick={() => onAction('arquivar')}>
          Arquivar veículo
        </Button>
      }
    />
  );
}
