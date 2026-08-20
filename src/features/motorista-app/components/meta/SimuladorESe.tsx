import { useState } from 'react';
import { Secao } from '../ui';
import { formatBRL, formatHoras, simular, type Cenario } from '../../lib/metas';

// SIMULADOR "E SE?" (Módulo 25; expandido na Fase 9 — Módulo 23 com cenários prontos).
// Mexe em CÓPIAS locais; nunca altera os dados reais. Cenários são SIMULAÇÃO, não recomendação.

export function SimuladorESe({ base, cenarios = [], mediaRegistrada = null }: {
  base: { custoTotal: number; diasTrabalho: number; rendaHora: number };
  cenarios?: Cenario[];
  /** Módulo 18 (Fase 10): média R$/h REGISTRADA — simular com ela, sem alterar dado real */
  mediaRegistrada?: number | null;
}) {
  const [dias, setDias] = useState(base.diasTrabalho);
  const [renda, setRenda] = useState(base.rendaHora);
  const [custo, setCusto] = useState(base.custoTotal);

  const r = simular(base, { custoTotal: custo, diasTrabalho: dias, rendaHora: renda });
  const mudou = dias !== base.diasTrabalho || renda !== base.rendaHora || Math.abs(custo - base.custoTotal) > 0.01;

  return (
    <Secao titulo='Simulador "E se?"'>
      <p className="mb-2 text-[11px] text-neutral-400">Ajuste os valores abaixo para simular. Nada aqui altera seus dados reais.</p>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-neutral-500">Dias de trabalho: <strong className="text-neutral-800 dark:text-neutral-100">{dias}</strong></span>
          <input type="range" min={10} max={31} value={dias} onChange={(e) => setDias(Number(e.target.value))} className="mt-1 w-full accent-emerald-600" />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-500">Renda por hora (premissa): <strong className="text-neutral-800 dark:text-neutral-100">{formatBRL(renda)}</strong></span>
          <input type="range" min={20} max={80} step={5} value={renda} onChange={(e) => setRenda(Number(e.target.value))} className="mt-1 w-full accent-emerald-600" />
          {mediaRegistrada != null && mediaRegistrada > 0 && Math.abs(mediaRegistrada - renda) > 0.5 && (
            <button type="button" className="mt-1 rounded-full border border-emerald-600 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400" onClick={() => setRenda(mediaRegistrada)}>
              Usar minha média registrada ({formatBRL(mediaRegistrada)}/h)
            </button>
          )}
        </label>
        <label className="block text-sm">
          <span className="text-neutral-500">Custo mensal: <strong className="text-neutral-800 dark:text-neutral-100">{formatBRL(custo)}</strong></span>
          <input type="range" min={Math.max(0, Math.round(base.custoTotal * 0.5))} max={Math.max(1000, Math.round(base.custoTotal * 1.5))} step={50} value={custo} onChange={(e) => setCusto(Number(e.target.value))} className="mt-1 w-full accent-emerald-600" />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-neutral-50 p-3 dark:bg-white/5">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">Atual</p>
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{formatBRL(r.atual.metaDiaria)}<span className="text-xs font-normal">/dia</span></p>
          {r.atual.horasPorDia != null && <p className="text-[11px] text-neutral-500">{formatHoras(r.atual.horasPorDia)}/dia</p>}
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400">Simulado</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatBRL(r.simulado.metaDiaria)}<span className="text-xs font-normal">/dia</span></p>
          {r.simulado.horasPorDia != null && <p className="text-[11px] text-neutral-500">{formatHoras(r.simulado.horasPorDia)}/dia</p>}
        </div>
      </div>
      {mudou && (
        <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-300">
          {r.diferencaDiaria <= 0
            ? `Diferença: ${formatBRL(Math.abs(r.diferencaDiaria))} a MENOS por dia.`
            : `Diferença: ${formatBRL(r.diferencaDiaria)} a MAIS por dia.`}
        </p>
      )}

      {/* Módulo 23 — cenários prontos (impacto matemático; a escolha é do motorista) */}
      {cenarios.length > 0 && (
        <div className="mt-3 border-t border-neutral-100 pt-2 dark:border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Cenários prontos</p>
          <ul className="mt-1 space-y-1.5">
            {cenarios.map((c) => (
              <li key={c.rotulo} className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-white/5">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{c.rotulo}</p>
                <p className="text-[11px] text-neutral-500">{c.impacto}</p>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[10px] text-neutral-400">Simulações matemáticas com as suas premissas — não são recomendações.</p>
        </div>
      )}
    </Secao>
  );
}
