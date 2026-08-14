import { Link } from 'react-router-dom';
import type { Risk } from '@/shared/intelligence/types';

// Hoisted de features/command-center/cards/ na Sprint 6 — ver nota em OpportunityCard.tsx.
// `href` opcional (Épico 1, achado #1) — ver nota equivalente em AlertCard.tsx.
export function RiskCard({ risco, href }: { risco: Risk; href?: string }) {
  const conteudo = (
    <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
      {risco.texto}
    </div>
  );
  if (!href) return conteudo;
  return (
    <Link to={href} className="block transition-opacity hover:opacity-80">
      {conteudo}
    </Link>
  );
}
