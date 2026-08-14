import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import type { Alerta } from '@/shared/intelligence/types';

const BADGE_COLOR: Record<Alerta['severidade'], string> = {
  atencao: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
  critico: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300',
};

// Card genérico de um único alerta. Sem `<ul>`/`<li>` embutido — quem compõe decide o wrapper.
//
// `href` opcional (Épico 1, achado #1 "cockpits burros"): quando informado (hoje só os
// widgets do Command Center passam, via PrioritizedAlerta.href), o card inteiro vira link pro
// Cockpit da entidade de origem — clicar num alerta leva direto pra onde ele se resolve, em
// vez de só informar que existe. Os painéis dentro do próprio Cockpit (AlertasPanel de
// Frota/Motoristas/Contratos) não passam href — já estão na página de destino.
export function AlertCard({ alerta, href }: { alerta: Alerta; href?: string }) {
  const conteudo = (
    <div className={cn('rounded-lg border px-2.5 py-1.5 text-xs', BADGE_COLOR[alerta.severidade])}>{alerta.texto}</div>
  );
  if (!href) return conteudo;
  return (
    <Link to={href} className="block transition-opacity hover:opacity-80">
      {conteudo}
    </Link>
  );
}
