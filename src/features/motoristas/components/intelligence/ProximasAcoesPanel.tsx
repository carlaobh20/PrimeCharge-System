import { CheckCircle2, ListTodo } from 'lucide-react';
import { NextActionCard } from '@/shared/components/intelligence/NextActionCard';
import type { NextAction } from '../../intelligence/types';
import type { ActionKey } from '../../lib/actions';

export function ProximasAcoesPanel({
  acoes,
  motoristaId,
  onAction,
}: {
  acoes: NextAction[];
  motoristaId: string;
  onAction: (key: ActionKey) => void;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <ListTodo className="h-3.5 w-3.5" />
        Próximas Ações
      </h3>
      {acoes.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Nenhuma lacuna identificada agora.
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {acoes.map((acao) => (
            <li key={acao.id}>
              <NextActionCard
                acao={acao}
                href={acao.actionKey === 'editar-cnh' ? `/motoristas/${motoristaId}/editar` : undefined}
                onClick={acao.actionKey === 'editar-cnh' ? undefined : () => onAction(acao.actionKey as ActionKey)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
