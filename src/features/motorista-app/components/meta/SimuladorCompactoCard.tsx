import { Secao } from '../ui';
import type { Cenario } from '../../lib/metas';

// FASE 23 — "E SE?" COMPACTO. Mostra só o primeiro cenário (headline) — o simulador completo com
// todos os cenários e o formulário livre continua em "Ver detalhes completos" (SimuladorESe,
// intocado). Nada de cálculo novo — mesma lista de Cenario[] já usada lá.

export function SimuladorCompactoCard({ cenarios, onVerTodos }: { cenarios: Cenario[]; onVerTodos: () => void }) {
  const destaque = cenarios[0];
  return (
    <Secao titulo="E se?">
      {destaque ? (
        <div className="rounded-xl bg-neutral-50 p-2.5 dark:bg-white/5">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{destaque.rotulo}</p>
          <p className="text-[12px] text-neutral-600 dark:text-neutral-300">{destaque.impacto}</p>
        </div>
      ) : (
        <p className="text-sm text-neutral-400">Nenhum cenário disponível ainda.</p>
      )}
      <button type="button" className="mt-2 w-full rounded-xl border border-dashed border-neutral-300 py-2 text-sm font-medium text-emerald-600 dark:border-white/20" onClick={onVerTodos}>
        Ver todos os cenários
      </button>
    </Secao>
  );
}
