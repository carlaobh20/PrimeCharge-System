import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Secao } from '../ui';
import { formatBRL, formatHoras, STATUS_DIA_LABEL, type DiaCalendario } from '../../lib/metas';

// CALENDÁRIO DO MÊS (Módulo 19): meta × realizado por dia. Status SEMPRE com símbolo + texto
// (nunca só cor). Tocar num dia abre o lançamento manual do realizado (Módulos 16/17 — o
// sistema não tem o faturamento dos aplicativos; nada é inventado).

const SIMBOLO: Record<DiaCalendario['status'], string> = {
  atingida: '✓',
  acima: '▲',
  abaixo: '▼',
  sem_dado: '·',
};

export function CalendarioMeta({
  dias,
  onLancar,
  salvando,
}: {
  dias: DiaCalendario[];
  onLancar: (data: { dia: number; valor: number; horas: number | null }) => void;
  salvando: boolean;
}) {
  const [diaAberto, setDiaAberto] = useState<DiaCalendario | null>(null);
  const [valor, setValor] = useState('');
  const [horas, setHoras] = useState('');
  const hoje = new Date().getDate();

  const abrir = (d: DiaCalendario) => {
    setDiaAberto(d);
    setValor(d.realizado != null ? String(d.realizado) : '');
    setHoras(d.horas != null ? String(d.horas) : '');
  };
  const salvar = () => {
    const v = Number(valor.replace(',', '.'));
    if (!diaAberto || !Number.isFinite(v) || v < 0) return;
    const h = Number(horas.replace(',', '.'));
    onLancar({ dia: diaAberto.dia, valor: v, horas: Number.isFinite(h) && h > 0 ? h : null });
    setDiaAberto(null);
  };

  return (
    <Secao titulo="Calendário do mês">
      <div className="grid grid-cols-7 gap-1">
        {dias.map((d) => (
          <button
            key={d.dia}
            type="button"
            onClick={() => abrir(d)}
            aria-label={`Dia ${d.dia}: ${STATUS_DIA_LABEL[d.status]}${d.realizado != null ? `, realizado ${formatBRL(d.realizado)}` : ''}`}
            className={cn(
              'flex flex-col items-center rounded-lg py-1.5 text-[11px]',
              d.dia === hoje && 'ring-1 ring-emerald-500',
              d.status === 'atingida' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
              d.status === 'acima' && 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
              d.status === 'abaixo' && 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
              d.status === 'sem_dado' && 'text-neutral-400',
            )}
          >
            <span className="font-semibold">{d.dia}</span>
            <span aria-hidden>{SIMBOLO[d.status]}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-neutral-400">✓ meta atingida · ▲ acima da meta · ▼ abaixo da meta · &nbsp;· sem dado</p>

      {diaAberto && (
        <div className="mt-3 space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-white/10">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Dia {diaAberto.dia} — meta {formatBRL(diaAberto.meta)}
          </p>
          {diaAberto.realizado != null && (
            <p className="text-[11px] text-neutral-500">
              Realizado: {formatBRL(diaAberto.realizado)} ({STATUS_DIA_LABEL[diaAberto.status]}
              {diaAberto.diferenca != null && `, ${diaAberto.diferenca >= 0 ? '+' : ''}${formatBRL(diaAberto.diferenca)}`})
              {diaAberto.horas != null && ` · ${formatHoras(diaAberto.horas)} trabalhadas`}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input className="h-10 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Quanto você fez? (R$)" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
            <input className="h-10 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Horas (opcional)" inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-xl px-3 py-2 text-sm text-neutral-500" onClick={() => setDiaAberto(null)}>Fechar</button>
            <button type="button" disabled={salvando} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={salvar}>
              Salvar dia
            </button>
          </div>
        </div>
      )}
    </Secao>
  );
}
