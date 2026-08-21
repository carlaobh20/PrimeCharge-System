import { Secao } from '../ui';
import type { Inconsistencia } from '../../lib/metas';

// INCONSISTÊNCIAS (Fase 12.2, Módulo 10) — detector FACTUAL: o que foi encontrado, qual dado
// originou, o que falta. Nunca "você fez errado" — os registros são do motorista.

export function InconsistenciasCard({ itens }: { itens: Inconsistencia[] }) {
  if (itens.length === 0) return null;
  return (
    <Secao id="secao-inconsistencias" titulo="Para completar seus registros">
      <ul className="space-y-2">
        {itens.map((i, idx) => (
          <li key={idx} className="rounded-xl border border-neutral-100 px-3 py-2 text-[12px] dark:border-white/10">
            <p className="font-medium text-neutral-800 dark:text-neutral-100">{i.achado}</p>
            <p className="text-[11px] text-neutral-500">Origem: {i.origem}</p>
            <p className="text-[11px] text-neutral-500">O que falta: {i.falta}</p>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[9px] text-neutral-400">Observações factuais dos seus registros — nada aqui é obrigatório.</p>
    </Secao>
  );
}
