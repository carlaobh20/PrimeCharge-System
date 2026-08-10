import { formatMoeda } from '@/shared/lib/format';
import type { ReceitaPerdida } from '../intelligence/receitaPerdida';

const LABEL: Record<keyof ReceitaPerdida['porCausa'], string> = {
  vacancia: 'Vacância',
  oficina: 'Oficina',
  documentacao: 'Documentação',
  sinistro: 'Sinistro',
  indisponibilidade: 'Indisponibilidade',
};

// Épico 5 — item 6. "Nunca inventar números. Se não houver dado suficiente, mostrar 'Dados
// insuficientes'" — literal: cada causa sem fonte mostra o texto, não um traço nem um zero.
export function ReceitaPerdidaCard({ receitaPerdida }: { receitaPerdida: ReceitaPerdida }) {
  const totalEstimado = Object.values(receitaPerdida.porCausa).reduce((soma, c) => soma + (c.valor ?? 0), 0);
  const algumaCausaComDado = Object.values(receitaPerdida.porCausa).some((c) => c.valor !== null);

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Receita Perdida (estimada)</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(Object.keys(receitaPerdida.porCausa) as Array<keyof ReceitaPerdida['porCausa']>).map((causa) => {
          const item = receitaPerdida.porCausa[causa];
          return (
            <div key={causa} className="rounded-lg border border-neutral-200 p-3 dark:border-white/10">
              <p className="text-xs text-neutral-400">{LABEL[causa]}</p>
              {item.valor !== null ? (
                <p className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400">{formatMoeda(item.valor)}</p>
              ) : (
                <p className="mt-1 text-sm text-neutral-400">Dados insuficientes</p>
              )}
            </div>
          );
        })}
      </div>
      {algumaCausaComDado && (
        <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-white/5">
          <p className="text-xs text-neutral-400">Total estimado (só causas com dado)</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatMoeda(totalEstimado)}</p>
        </div>
      )}
      <p className="mt-3 text-[11px] text-neutral-400">
        Estimativa: dias em cada estado × taxa diária média dos contratos do veículo. Não é receita perdida confirmada.
      </p>
    </div>
  );
}
