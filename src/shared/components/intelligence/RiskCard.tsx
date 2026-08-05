import type { Risk } from '@/shared/intelligence/types';

// Hoisted de features/command-center/cards/ na Sprint 6 — ver nota em OpportunityCard.tsx.
export function RiskCard({ risco }: { risco: Risk }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
      {risco.texto}
    </div>
  );
}
