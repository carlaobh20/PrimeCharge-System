import { Settings } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Button } from '@/shared/components/ui/button';
import type { ActionKey } from '../../lib/actions';

export function ConfiguracoesTab({ onAction }: { onAction: (key: ActionKey) => void }) {
  return (
    <EmptyState
      icon={Settings}
      title="Nenhuma preferência configurável ainda"
      description="Lembrete de renovação e responsável padrão ainda não existem — isso é só texto. O botão abaixo já é uma ação real: cancela o contrato imediatamente, não é uma prévia."
      action={
        <Button type="button" variant="outline" size="sm" onClick={() => onAction('cancelar')}>
          Cancelar contrato
        </Button>
      }
    />
  );
}
