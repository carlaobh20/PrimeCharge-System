import { AlertTriangle, CalendarClock } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { useMultasPorMotorista } from '@/features/operacoes/hooks/useMultas';
import { MULTA_STATUS_LABEL, type MultaStatus } from '@/features/operacoes/types';
import type { ActionKey } from '../../lib/actions';

const STATUS_BADGE: Record<MultaStatus, 'warning' | 'success' | 'secondary' | 'destructive'> = {
  pendente: 'warning',
  paga: 'success',
  recorrida: 'secondary',
  cancelada: 'destructive',
};

// "Eventos" é operacional (ocorrência, multa, sinistro, avaliação) — diferente de "Timeline"
// (narrativa de mudança de status) e de "Histórico" (diff bruto de auditoria). Mesmo
// vocabulário de EventosTab do Veículo.
//
// Missão 4 (achado #12 da auditoria de jornada): antes desta correção, esta aba era um
// EmptyState estático — nenhum evento aparecia aqui de verdade, mesmo quando existiam multas
// registradas contra este motorista (`multas` agora existe). Criação continua sempre exigindo
// escolher um veículo (abre NovaMultaDialog com `motoristaId` pré-preenchido) — mesmo racional
// de DEC-006 (não existe "vínculo" fora de uma entidade concreta que o exija).
export function EventosTab({ motoristaId, onAction }: { motoristaId: string; onAction: (key: ActionKey) => void }) {
  const { data: multas, isLoading } = useMultasPorMotorista(motoristaId);

  if (isLoading) {
    return <div className="h-32 cockpit-shimmer rounded-2xl" />;
  }

  if (!multas || multas.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nenhum evento operacional ainda"
        description="Multas registradas contra este motorista aparecem aqui em ordem cronológica."
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => onAction('ocorrencia')}>
            Registrar multa
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => onAction('ocorrencia')}>
          <AlertTriangle className="h-4 w-4" />
          Registrar multa
        </Button>
      </div>
      <div className="space-y-2">
        {multas.map((m) => (
          <div key={m.id} className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 dark:border-white/10">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_BADGE[m.status]}>{MULTA_STATUS_LABEL[m.status]}</Badge>
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{m.descricao}</p>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {formatDataSimples(m.data_infracao)} · {m.orgao_autuador}
                {m.veiculo ? ` · ${m.veiculo.placa}` : ''}
                {m.valor !== null ? ` · ${formatMoeda(m.valor)}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
