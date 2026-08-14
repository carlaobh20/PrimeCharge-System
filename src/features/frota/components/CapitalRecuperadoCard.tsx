import { formatMoeda } from '@/shared/lib/format';
import type { CapitalRecuperadoResult } from '../intelligence/investmentSimulator';

// Épico 4 — "Ativo Financeiro", Parte 3. Card grande, visual, sem texto explicativo — a barra
// de progresso é a única "explicação". Recalcula sozinho a cada render a partir do lucro
// confirmado (React Query) — não existe botão "atualizar".
export function CapitalRecuperadoCard({ resultado }: { resultado: CapitalRecuperadoResult }) {
  const semDado = resultado.percentualRecuperado === null;
  const pct = resultado.percentualRecuperado ?? 0;

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Capital Recuperado</h3>

      {semDado ? (
        <p className="mt-3 text-[11px] text-neutral-400">Sem valor de compra cadastrado.</p>
      ) : (
        <>
          <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-100">{pct.toFixed(1)}%</p>

          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-neutral-400">Investido</p>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{formatMoeda(resultado.capitalInvestido)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Recuperado</p>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">{formatMoeda(resultado.capitalRecuperado)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Restante</p>
              <p className="font-medium text-neutral-700 dark:text-neutral-300">{formatMoeda(resultado.capitalRestante)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
