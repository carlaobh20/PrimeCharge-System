import { useState } from 'react';
import { Secao } from '../ui';
import { formatBRL, formatHoras, type ResumoDiaOperacional } from '../../lib/metas';

// MEUS DIAS (Fase 12.1) — histórico operacional com filtro 7/14/30. Cada linha mostra só o que
// foi REGISTRADO; campo ausente = SEM DADO/NÃO INF. Nada é preenchido com estimativa.

export function HistoricoOperacionalCard({ dias, hojeIso }: {
  dias: { data: string; resumo: ResumoDiaOperacional }[];
  hojeIso: string;
}) {
  const [janela, setJanela] = useState<7 | 14 | 30 | 90>(7);
  const limite = new Date(`${hojeIso}T12:00:00`).getTime() - (janela - 1) * 86_400_000;
  const doPeriodo = dias.filter((d) => new Date(`${d.data}T12:00:00`).getTime() >= limite);

  return (
    <Secao titulo="Meus dias">
      <div className="flex gap-1.5" role="tablist" aria-label="Período do histórico">
        {([7, 14, 30, 90] as const).map((n) => (
          <button key={n} type="button" role="tab" aria-selected={janela === n} onClick={() => setJanela(n)} className={`flex-1 rounded-full border py-1.5 text-[12px] font-medium ${janela === n ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-neutral-200 text-neutral-500 dark:border-white/10'}`}>
            {n} dias
          </button>
        ))}
      </div>

      {doPeriodo.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">SEM DADO neste período — encerre seus dias para construir o histórico.</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {doPeriodo.map(({ data, resumo }) => (
            <div key={data} className="rounded-xl border border-neutral-100 px-3 py-2 dark:border-white/10">
              <div className="flex items-baseline justify-between">
                <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-100">
                  {data.slice(8, 10)}/{data.slice(5, 7)}
                </p>
                <p className="text-[12px] font-bold text-neutral-900 dark:text-white">{formatBRL(resumo.ganho)}</p>
              </div>
              <p className="text-[11px] text-neutral-500">
                {resumo.horas != null ? `${formatHoras(resumo.horas)}` : 'horas: SEM DADO'}
                {resumo.rph != null && ` · ${formatBRL(resumo.rph)}/h`}
                {resumo.kmRodados != null ? ` · ${resumo.kmRodados} km` : resumo.kmIncompleto ? ' · KM INCOMPLETO' : ''}
                {resumo.rpkm != null && ` · ${formatBRL(resumo.rpkm)}/km`}
                {resumo.corridas != null && ` · ${resumo.corridas} corrida(s)`}
              </p>
              {(resumo.custoRecargasDia > 0 || resumo.resultadoOperacional !== resumo.ganho) && (
                <p className="text-[11px] text-neutral-500">
                  custos registrados {formatBRL(resumo.custoRecargasDia)} · resultado operacional{' '}
                  <span className={resumo.resultadoOperacional >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                    {resumo.resultadoOperacional >= 0 ? '+' : '−'}{formatBRL(Math.abs(resumo.resultadoOperacional))}
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Secao>
  );
}
