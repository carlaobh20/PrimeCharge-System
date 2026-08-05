import { CalendarClock } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Button } from '@/shared/components/ui/button';
import type { ActionKey } from '../../lib/actions';

// "Eventos" é operacional (manutenção agendada, abastecimento, revisão, sinistro) — diferente
// de "Timeline" (narrativa de mudança de status) e de "Histórico" (diff bruto de auditoria).
export function EventosTab({ onAction }: { onAction: (key: ActionKey) => void }) {
  return (
    <EmptyState
      icon={CalendarClock}
      title="Nenhum evento operacional ainda"
      description="Manutenções, abastecimentos, revisões e sinistros vão aparecer aqui em ordem cronológica quando esses registros existirem."
      action={
        <Button type="button" variant="outline" size="sm" onClick={() => onAction('manutencao')}>
          Registrar manutenção
        </Button>
      }
    />
  );
}
