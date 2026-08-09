import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatMoeda } from '@/shared/lib/format';
import type { FilaDeTrabalho } from '../hooks/useFilasDeTrabalho';

const PRIORIDADE_COR: Record<'critica' | 'alta' | 'media', string> = {
  critica: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20',
  alta: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20',
  media: 'border-neutral-200 bg-white dark:border-white/10 dark:bg-white/[0.03]',
};

const PRIORIDADE_BADGE: Record<'critica' | 'alta' | 'media', string> = {
  critica: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  alta: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  media: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
};

// Card de fila de trabalho do Centro de Operações (Épico 1). Achado da auditoria: cada card
// precisa responder de cara "quantos", "quão urgente", "quanto custa" e "quanto tempo já
// passou" — e o clique tem que ir direto pra onde o operador resolve, nunca só informar.
// `contextoDias` é texto livre por fila (chave semântica diferente: "mais atrasado" pra
// prazo, "aberto há" pra checklist, "aprox. parado há" pra status sem tracking de transição)
// — decidido pelo componente que monta a grid, não aqui, pra este Card continuar genérico.
export function QueueCard({
  fila,
  icon: Icon,
  contextoDias,
}: {
  fila: FilaDeTrabalho;
  icon: LucideIcon;
  contextoDias?: (dias: number) => string;
}) {
  const vazio = fila.quantidade === 0;
  const cor = fila.prioridade ? PRIORIDADE_COR[fila.prioridade] : 'border-neutral-200 bg-white dark:border-white/10 dark:bg-white/[0.03]';

  const conteudo = (
    <div className={cn('flex h-full flex-col gap-2 rounded-2xl border p-4 transition-colors', cor, !vazio && 'hover:opacity-90')}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <Icon className="h-3.5 w-3.5" />
          {fila.titulo}
        </span>
        {fila.prioridade && (
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', PRIORIDADE_BADGE[fila.prioridade])}>
            {fila.prioridade}
          </span>
        )}
      </div>

      <p className={cn('text-3xl font-semibold', vazio ? 'text-neutral-300 dark:text-neutral-700' : 'text-neutral-900 dark:text-neutral-100')}>
        {fila.quantidade}
      </p>

      <div className="mt-auto space-y-0.5 text-xs text-neutral-500">
        {fila.impactoFinanceiro !== null && <p className="font-medium text-neutral-700 dark:text-neutral-300">{formatMoeda(fila.impactoFinanceiro)}</p>}
        {fila.diasPior !== null && contextoDias && <p>{contextoDias(fila.diasPior)}</p>}
        {vazio && <p>Tudo em dia</p>}
      </div>
    </div>
  );

  if (vazio) return conteudo;
  return (
    <Link to={fila.href} className="block h-full">
      {conteudo}
    </Link>
  );
}
