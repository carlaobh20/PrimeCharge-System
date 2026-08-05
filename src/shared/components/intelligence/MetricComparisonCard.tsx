import type { ComparativoItem } from '@/shared/intelligence/types';

// Card genérico de uma métrica comparada com a média de um grupo (frota, equipe...).
// A formatação de valor (km, R$, número puro) é responsabilidade de quem compõe — cada
// feature tem suas próprias unidades, o card só desenha a barra e o rótulo.
export function MetricComparisonCard({
  item,
  formatValor = (valor, unidade) => `${Math.round(valor)} ${unidade}`,
}: {
  item: ComparativoItem;
  formatValor?: (valor: number, unidade: string) => string;
}) {
  const max = Math.max(item.valorAtual, item.mediaGrupo, 1);

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-600 dark:text-neutral-300">{item.label}</span>
        <span className="text-neutral-400">
          este:{' '}
          <span className="font-medium text-neutral-700 dark:text-neutral-200">
            {formatValor(item.valorAtual, item.unidade)}
          </span>
          {' · '}grupo: {formatValor(item.mediaGrupo, item.unidade)}
        </span>
      </div>
      <div className="mt-1.5 space-y-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(item.valorAtual / max) * 100}%` }} />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
          <div className="h-full rounded-full bg-neutral-300 dark:bg-neutral-600" style={{ width: `${(item.mediaGrupo / max) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
