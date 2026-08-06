import { Link } from 'react-router-dom';
import { AlertTriangle, CheckSquare, ListTodo, ShieldAlert, TrendingUp, type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { CommandCenterFeedItem, FeedItemTipo } from '../types';
import type { Prioridade } from '@/shared/intelligence/types';

const TIPO_ICON: Record<FeedItemTipo, LucideIcon> = {
  alerta: AlertTriangle,
  risco: ShieldAlert,
  oportunidade: TrendingUp,
  acao: ListTodo,
  acao_operacional: CheckSquare,
};

const TIPO_LABEL: Record<FeedItemTipo, string> = {
  alerta: 'Alerta',
  risco: 'Risco',
  oportunidade: 'Oportunidade',
  acao: 'Ação',
  acao_operacional: 'Ação operacional',
};

const PRIORIDADE_BADGE: Record<Prioridade, string> = {
  critica: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  alta: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  media: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  baixa: 'bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-400',
};

// Único item genérico capaz de representar qualquer um dos 4 tipos que alimentam
// "Prioridades do Dia" (alerta/risco/oportunidade/ação) — é o que permite ordenar os 4
// juntos numa lista só sem o card saber a regra de negócio por trás de cada um.
export function PriorityFeedItemCard({ item }: { item: CommandCenterFeedItem }) {
  const Icon = TIPO_ICON[item.tipo];

  const conteudo = (
    <div className="flex items-start gap-2.5 rounded-lg border border-neutral-200 px-3 py-2 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-white/10 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{item.texto}</p>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-400">
          <span>{item.origemLabel}</span>
          <span>·</span>
          <span>{TIPO_LABEL[item.tipo]}</span>
        </div>
      </div>
      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', PRIORIDADE_BADGE[item.prioridade])}>
        {item.prioridade}
      </span>
    </div>
  );

  if (!item.href) return conteudo;
  return (
    <Link to={item.href} className="block">
      {conteudo}
    </Link>
  );
}
