import { Secao, Linha } from '../ui';
import { formatBRL, formatHoras, STATUS_DIA_LABEL, type ResumoSemana } from '../../lib/metas';

// VISÃO SEMANAL + "COMO ESTOU INDO?" (Fase 11, Módulos 14/15) — Seg→Dom da semana corrente,
// barras CSS (sem biblioteca). Dia sem registro = SEM DADO; futuro fica apagado. Meta semanal
// é ESTIMATIVA com fórmula declarada. Tudo factual.

const SIMBOLO = { atingida: '✓', acima: '▲', abaixo: '▼', sem_dado: '·' } as const;

export function SemanaCard({ semana, extras }: {
  semana: ResumoSemana;
  /** Fase 12.1: km e R$/h REGISTRADOS por data (quando existirem) */
  extras?: Record<string, { km: number | null; rph: number | null }>;
}) {
  const max = Math.max(1, ...semana.dias.map((d) => d.valor ?? 0));
  return (
    <Secao titulo="Minha semana">
      <div className="grid grid-cols-7 gap-1" role="img" aria-label="Resumo da semana, segunda a domingo">
        {semana.dias.map((d) => (
          <div key={d.data} className={`flex flex-col items-center rounded-lg py-1.5 ${d.futuro ? 'opacity-30' : ''}`}>
            <span className="text-[10px] font-semibold text-neutral-500">{d.label}</span>
            <div className="mt-1 flex h-14 w-3 items-end overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
              <div
                className={`w-full rounded-full ${d.status === 'abaixo' ? 'bg-amber-400' : 'bg-emerald-500'}`}
                style={{ height: `${d.valor != null ? Math.max(6, Math.round((d.valor / max) * 100)) : 0}%` }}
              />
            </div>
            <span aria-label={STATUS_DIA_LABEL[d.status]} className="mt-0.5 text-[10px] text-neutral-500">{SIMBOLO[d.status]}</span>
            <span className="text-[9px] text-neutral-400">{d.valor != null ? formatBRL(d.valor).replace(/^R\$\s?/, '') : '—'}</span>
            {extras?.[d.data]?.km != null && <span className="text-[8px] text-neutral-400">{extras[d.data].km}km</span>}
            {extras?.[d.data]?.rph != null && <span className="text-[8px] text-neutral-400">{formatBRL(extras[d.data].rph as number).replace(/^R\$\s?/, '')}/h</span>}
          </div>
        ))}
      </div>
      <p className="text-center text-[9px] text-neutral-400">✓ na meta · ▲ acima · ▼ abaixo · — sem dado</p>

      {/* Módulo 15 — como estou indo? */}
      <div className="mt-2 border-t border-neutral-100 pt-2 dark:border-white/10">
        <Linha label="Registrado na semana" value={formatBRL(semana.totalValor)} />
        <Linha label="Horas" value={semana.totalHoras != null ? formatHoras(semana.totalHoras) : 'SEM DADO'} />
        <Linha label="R$/h da semana" value={semana.rsHora != null ? `${formatBRL(semana.rsHora)}/h` : 'SEM DADO'} />
        <Linha label="Meta semanal · ESTIMATIVA" value={formatBRL(semana.metaSemanalEstimada)} />
        <Linha
          label="Diferença"
          value={`${semana.diferenca >= 0 ? '+' : '−'}${formatBRL(Math.abs(semana.diferenca))}`}
        />
        <p className="mt-0.5 text-[9px] text-neutral-400">
          Meta semanal = meta diária original × {semana.diasPlanejadosSemana} dia(s) planejado(s) na semana (proporcional aos seus dias do mês).
        </p>
      </div>
    </Secao>
  );
}
