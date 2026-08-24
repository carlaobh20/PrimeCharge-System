import { useState } from 'react';
import { Secao } from '../ui';
import { formatBRL, formatHoras, type ResumoSemana } from '../../lib/metas';

// FASE 23 — FAIXA DE HISTÓRICO (7 dias, horizontal) — vira a visão PRIMÁRIA do dia a dia,
// substituindo o calendário completo como primeiro contato. O calendário do mês inteiro continua
// existindo e acessível em "Ver detalhes completos" (nada removido, só reordenado). Reusa
// d.semana (ResumoSemana) — mesmos dados do SemanaCard já existente, zero cálculo novo aqui.

const COR_STATUS: Record<string, string> = {
  atingida: 'bg-emerald-500',
  acima: 'bg-emerald-500',
  abaixo: 'bg-amber-500',
  sem_dado: 'bg-neutral-200 dark:bg-white/10',
};

export function FaixaHistoricoCard({ semana }: { semana: ResumoSemana }) {
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const dia = selecionado != null ? semana.dias[selecionado] : null;

  return (
    <Secao titulo="Esta semana">
      <div className="flex justify-between gap-1">
        {semana.dias.map((d, i) => (
          <button
            key={d.data}
            type="button"
            className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 ${selecionado === i ? 'bg-neutral-100 dark:bg-white/10' : ''} ${d.futuro ? 'opacity-40' : ''}`}
            disabled={d.futuro}
            onClick={() => setSelecionado(selecionado === i ? null : i)}
          >
            <span className="text-[10px] font-medium text-neutral-500">{d.label}</span>
            <span className={`h-8 w-2.5 rounded-full ${d.futuro ? 'bg-neutral-100 dark:bg-white/5' : COR_STATUS[d.status]}`} aria-hidden />
            <span className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-200">
              {d.valor != null ? formatBRL(d.valor).replace('R$', '').trim() : '—'}
            </span>
          </button>
        ))}
      </div>

      {dia && (
        <div className="mt-2 rounded-xl bg-neutral-50 p-2.5 text-[12px] dark:bg-white/5">
          <p className="font-semibold text-neutral-800 dark:text-neutral-100">
            {dia.label} · {dia.data.slice(8, 10)}/{dia.data.slice(5, 7)}
          </p>
          {dia.valor != null ? (
            <>
              <p className="text-neutral-600 dark:text-neutral-300">Ganho: {formatBRL(dia.valor)}{dia.horas != null && ` · ${formatHoras(dia.horas)}`}</p>
              <p className="text-neutral-500">{dia.encerrado ? 'Dia encerrado' : 'Em andamento'}</p>
            </>
          ) : (
            <p className="text-neutral-400">Sem registro neste dia.</p>
          )}
        </div>
      )}

      <p className="mt-1.5 text-[11px] text-neutral-500">
        Total da semana: {formatBRL(semana.totalValor)}{semana.rsHora != null && ` · ${formatBRL(semana.rsHora)}/h`}
      </p>
    </Secao>
  );
}
