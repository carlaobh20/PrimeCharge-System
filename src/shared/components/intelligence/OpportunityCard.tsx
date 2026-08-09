import { Link } from 'react-router-dom';
import { formatMoeda } from '@/shared/lib/format';
import type { Opportunity } from '@/shared/intelligence/types';

// Hoisted de features/command-center/cards/ na Sprint 6 — Motoristas foi a segunda feature
// a precisar (ver DEC-025 e a nota equivalente em DEC-023 para os Cards de Insight/Alerta).
// `href` opcional (Épico 1, achado #1) — ver nota equivalente em AlertCard.tsx.
export function OpportunityCard({ oportunidade, href }: { oportunidade: Opportunity; href?: string }) {
  const conteudo = (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
      <p>{oportunidade.texto}</p>
      {oportunidade.valorEstimado !== undefined && (
        <p className="mt-1 font-medium">{formatMoeda(oportunidade.valorEstimado)}</p>
      )}
    </div>
  );
  if (!href) return conteudo;
  return (
    <Link to={href} className="block transition-opacity hover:opacity-80">
      {conteudo}
    </Link>
  );
}
