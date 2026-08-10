import { Link } from 'react-router-dom';
import { Scale, ArrowRight } from 'lucide-react';

// Épico 5 — "Fleet Intelligence 360". Substitui o antigo ComparativosPanel (embutido aqui,
// comparava só este veículo vs. média da frota em 3 métricas soltas — km, dias, valor de
// mercado). Auditoria encontrou que isso duplicava propósito com o Comparativo de Veículos
// dedicado (aba própria no menu Frota, ranking completo, mais métricas, agrupável por
// marca/modelo/categoria) sem que ninguém tivesse aposentado o painel antigo quando o novo
// nasceu — duas telas fazendo a mesma coisa. Em vez de manter os dois, este CTA leva direto pro
// Comparativo dedicado com este veículo já destacado na tabela (?destaque=<id>).
export function VerComparativoCTA({ veiculoId }: { veiculoId: string }) {
  return (
    <Link
      to={`/veiculos?tab=comparativo&destaque=${veiculoId}`}
      className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <Scale className="h-3.5 w-3.5" />
        Ver comparativo com a frota
      </span>
      <ArrowRight className="h-4 w-4 text-neutral-400" />
    </Link>
  );
}
