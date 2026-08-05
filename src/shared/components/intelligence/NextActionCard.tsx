import { Link } from 'react-router-dom';
import type { NextAction } from '@/shared/intelligence/types';

const baseClass =
  'block w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-left text-xs text-neutral-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:text-neutral-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30';

// Card genérico de uma única próxima ação. De propósito, o card não sabe nada sobre rotas
// ou sobre qual Command Action cada `actionKey` dispara — isso é decisão de quem compõe
// (ex.: ProximasAcoesPanel do módulo Veículos, que resolve `href` para links diretos e
// `onClick` para Command Actions). Isso é o que permite o mesmo card servir Motoristas,
// Contratos etc. sem acoplar a nenhuma rota específica.
export function NextActionCard({ acao, href, onClick }: { acao: NextAction; href?: string; onClick?: () => void }) {
  if (href) {
    return (
      <Link to={href} className={baseClass}>
        {acao.texto}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {acao.texto}
    </button>
  );
}
