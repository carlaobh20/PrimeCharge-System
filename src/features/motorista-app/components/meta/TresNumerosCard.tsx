import { Secao } from '../ui';
import { formatBRL, type ProjecoesDuplas } from '../../lib/metas';

// TRÊS NÚMEROS (Fase 12.2, Módulo 12) — META × REAL × PROJEÇÃO, com a FONTE da projeção
// declarada (PELA PREMISSA × PELO HISTÓRICO REGISTRADO). Projeção nunca é promessa.

export function TresNumerosCard({ meta, real, projecoes }: {
  meta: number;
  real: number;
  projecoes: ProjecoesDuplas | null;
}) {
  const proj = projecoes?.peloHistorico ?? projecoes?.pelaPremissa ?? null;
  const fonte = projecoes?.peloHistorico ? 'PELO HISTÓRICO REGISTRADO' : projecoes ? 'PELA PREMISSA' : null;
  return (
    <Secao id="secao-projecao">
      <div className="grid grid-cols-3 gap-2 text-center" role="img" aria-label={`Meta ${formatBRL(meta)}, real ${formatBRL(real)}, projeção ${proj ? formatBRL(proj.valor) : 'sem dados'}`}>
        <div className="rounded-2xl bg-neutral-100 p-3 dark:bg-white/5">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">Meta</p>
          <p className="text-lg font-extrabold text-neutral-900 dark:text-white">{formatBRL(meta)}</p>
          <p className="text-[9px] text-neutral-400">a cobrir no mês</p>
        </div>
        <div className="rounded-2xl bg-emerald-600 p-3 text-white">
          <p className="text-[10px] uppercase tracking-wide opacity-80">Real</p>
          <p className="text-lg font-extrabold">{formatBRL(real)}</p>
          <p className="text-[9px] opacity-75">DADO REGISTRADO</p>
        </div>
        <div className="rounded-2xl bg-neutral-900 p-3 text-white dark:bg-white/10">
          <p className="text-[10px] uppercase tracking-wide opacity-80">Projeção</p>
          <p className="text-lg font-extrabold">{proj ? formatBRL(proj.valor) : '—'}</p>
          <p className="text-[9px] opacity-75">{fonte ?? 'DADOS INSUFICIENTES'}</p>
        </div>
      </div>
      <p className="mt-1 text-center text-[9px] text-neutral-400">
        Projeção = continuação matemática {fonte === 'PELO HISTÓRICO REGISTRADO' ? 'da sua média registrada' : 'da premissa'} — não é promessa.
      </p>
    </Secao>
  );
}
