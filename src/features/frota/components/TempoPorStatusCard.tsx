import type { TempoPorStatus } from '../intelligence/tempoPorStatus';

// Épico 5 — Fase E.4. Mesmo padrão visual do CapitalRecuperadoCard (barra + números embaixo),
// mas com 3 segmentos em vez de 1 — aqui não há "percentual concluído", é uma distribuição.
export function TempoPorStatusCard({ resultado }: { resultado: TempoPorStatus }) {
  const { paradoDias, alugadoDias, oficinaDias, outrosDias, totalDias, aproximado } = resultado;

  const pct = (dias: number) => (totalDias > 0 ? (dias / totalDias) * 100 : 0);

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Tempo por Status</h3>

      {totalDias === 0 ? (
        <p className="mt-3 text-[11px] text-neutral-400">Sem histórico suficiente ainda.</p>
      ) : (
        <>
          <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
            {paradoDias > 0 && <div className="h-full bg-amber-500" style={{ width: `${pct(paradoDias)}%` }} />}
            {alugadoDias > 0 && <div className="h-full bg-emerald-500" style={{ width: `${pct(alugadoDias)}%` }} />}
            {oficinaDias > 0 && <div className="h-full bg-red-500" style={{ width: `${pct(oficinaDias)}%` }} />}
            {outrosDias > 0 && <div className="h-full bg-neutral-300 dark:bg-neutral-600" style={{ width: `${pct(outrosDias)}%` }} />}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="flex items-center gap-1 text-xs text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Parado
              </p>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{paradoDias} dia(s)</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Alugado
              </p>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{alugadoDias} dia(s)</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Oficina
              </p>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{oficinaDias} dia(s)</p>
            </div>
          </div>

          {aproximado && (
            <p className="mt-3 text-[11px] text-neutral-400">
              Aproximado — a Timeline não tinha histórico de status legível para reconstruir a linha do tempo completa.
            </p>
          )}
        </>
      )}
    </div>
  );
}
