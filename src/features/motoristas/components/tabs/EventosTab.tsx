import { CalendarClock } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Button } from '@/shared/components/ui/button';
import type { ActionKey } from '../../lib/actions';

// "Eventos" é operacional (ocorrência, multa, sinistro, avaliação) — diferente de "Timeline"
// (narrativa de mudança de status) e de "Histórico" (diff bruto de auditoria). Mesmo
// vocabulário de EventosTab do Veículo.
export function EventosTab({ onAction }: { onAction: (key: ActionKey) => void }) {
  return (
    <EmptyState
      icon={CalendarClock}
      title="Nenhum evento operacional ainda"
      description="Ocorrências, multas e sinistros vão aparecer aqui em ordem cronológica quando esses registros existirem."
      action={
        <Button type="button" variant="outline" size="sm" onClick={() => onAction('ocorrencia')}>
          Registrar ocorrência
        </Button>
      }
    />
  );
}
