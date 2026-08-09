import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import type { Insight } from '@/shared/intelligence/types';

const DOT_COLOR: Record<Insight['severidade'], string> = {
  info: 'bg-blue-400',
  positivo: 'bg-emerald-500',
  atencao: 'bg-amber-500',
};

// Card genérico de um único insight — quem decide o layout de lista/grade em volta é o
// painel que compõe (ex.: InsightsPanel do módulo Veículos). Não assume `<ul>`/`<li>` por
// fora, pra poder ser reaproveitado em qualquer contexto (painel, sidebar, dashboard).
// `href` opcional (Épico 1, achado #1) — ver nota equivalente em AlertCard.tsx.
export function InsightCard({ insight, href }: { insight: Insight; href?: string }) {
  const conteudo = (
    <div className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
      <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', DOT_COLOR[insight.severidade])} />
      {insight.texto}
    </div>
  );
  if (!href) return conteudo;
  return (
    <Link to={href} className="block transition-opacity hover:opacity-80">
      {conteudo}
    </Link>
  );
}
