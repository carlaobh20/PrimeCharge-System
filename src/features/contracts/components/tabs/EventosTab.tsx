import { CalendarClock } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Button } from '@/shared/components/ui/button';
import type { ActionKey } from '../../lib/actions';

// "Eventos" é operacional (atraso, sinistro durante a locação, ocorrência) — diferente de
// "Timeline" (narrativa de mudança de status) e "Histórico" (diff bruto de auditoria). Mesmo
// vocabulário de EventosTab em Veículo/Motorista.
export function EventosTab({ onAction }: { onAction: (key: ActionKey) => void }) {
  return (
    <EmptyState
      icon={CalendarClock}
      title="Nenhum evento operacional ainda"
      description="Atrasos e ocorrências durante a locação vão aparecer aqui em ordem cronológica quando o módulo Financeiro existir."
      action={
        <Button type="button" variant="outline" size="sm" onClick={() => onAction('atraso')}>
          Registrar atraso
        </Button>
      }
    />
  );
}
