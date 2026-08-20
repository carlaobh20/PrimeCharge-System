import { useState } from 'react';
import { Minus, Moon, Sunrise, TrendingDown, TrendingUp } from 'lucide-react';
import {
  formatBRL,
  formatHoras,
  STATUS_DIA_HOJE_LABEL,
  type MetaHojeCockpit,
} from '../../lib/metas';

// HERO DO COCKPIT (Módulos 1/2/8/14/18) — a primeira dobra responde "quanto eu preciso fazer
// HOJE?". Grande número = meta de hoje (rebalanceada). Status do dia SEMPRE com ícone + texto +
// valor + percentual (nunca só cor). "Encerrar dia" pede ganho + horas; correção continua livre
// pelo calendário. Renda/hora é PREMISSA — nunca afirmada como rendimento real.

const ICONE_STATUS = {
  nao_comecou: Sunrise,
  abaixo_ritmo: TrendingDown,
  no_ritmo: Minus,
  acima_ritmo: TrendingUp,
  encerrado: Moon,
} as const;

export function HeroHoje({
  hoje,
  mesLabel,
  rendaHora,
  onEncerrarDia,
  salvando,
}: {
  hoje: MetaHojeCockpit;
  mesLabel: string;
  rendaHora: number;
  onEncerrarDia: (dados: { valor: number; horas: number | null }) => void;
  salvando: boolean;
}) {
  const [encerrando, setEncerrando] = useState(false);
  const [valor, setValor] = useState('');
  const [horas, setHoras] = useState('');
  const Icone = ICONE_STATUS[hoje.status];

  const salvar = () => {
    const v = Number(valor.replace(',', '.'));
    if (!Number.isFinite(v) || v < 0) return;
    const h = Number(horas.replace(',', '.'));
    onEncerrarDia({ valor: v, horas: Number.isFinite(h) && h > 0 ? h : null });
    setEncerrando(false);
    setValor('');
    setHoras('');
  };

  return (
    <section className="rounded-2xl bg-emerald-600 p-4 text-white">
      <div className="flex items-start justify-between">
        <p className="text-[11px] uppercase tracking-wide opacity-80">Meta de hoje · {mesLabel}</p>
        {/* STATUS DO DIA (Módulo 2): ícone + texto + percentual */}
        <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium">
          <Icone className="h-3.5 w-3.5" aria-hidden />
          {STATUS_DIA_HOJE_LABEL[hoje.status]}
          {hoje.pctDia != null && ` · ${hoje.pctDia}%`}
        </span>
      </div>

      <p className="mt-1 text-4xl font-extrabold">{formatBRL(hoje.metaHoje)}</p>
      {Math.abs(hoje.metaHoje - hoje.metaDiariaOriginal) > 0.5 && (
        <p className="text-[11px] opacity-80">
          Meta diária original: {formatBRL(hoje.metaDiariaOriginal)} — hoje está rebalanceada pelo que falta no mês.
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/10 p-2">
          <p className="text-[10px] uppercase tracking-wide opacity-75">Realizado</p>
          <p className="text-sm font-bold">{hoje.realizadoHoje != null ? formatBRL(hoje.realizadoHoje) : 'SEM DADO'}</p>
        </div>
        <div className="rounded-xl bg-white/10 p-2">
          <p className="text-[10px] uppercase tracking-wide opacity-75">Restante</p>
          <p className="text-sm font-bold">{hoje.faltanteHoje != null ? formatBRL(hoje.faltanteHoje) : formatBRL(hoje.metaHoje)}</p>
        </div>
        <div className="rounded-xl bg-white/10 p-2">
          <p className="text-[10px] uppercase tracking-wide opacity-75">Horas rest.</p>
          <p className="text-sm font-bold">
            {hoje.horasRestantes != null
              ? `≈ ${formatHoras(hoje.horasRestantes)}`
              : hoje.horasNecessariasHoje != null
                ? `≈ ${formatHoras(hoje.horasNecessariasHoje)}`
                : '—'}
          </p>
        </div>
      </div>

      {/* Módulo 8 — horas trabalhadas × restantes */}
      {hoje.horasTrabalhadasHoje != null && hoje.horasNecessariasHoje != null && (
        <p className="mt-1.5 text-[11px] opacity-90">
          {formatHoras(hoje.horasTrabalhadasHoje)} trabalhadas de ≈ {formatHoras(hoje.horasNecessariasHoje)} previstas hoje.
        </p>
      )}

      {/* Módulo 14 — sobra do dia */}
      {hoje.sobreAMeta != null && hoje.sobreAMeta > 0 && (
        <p className="mt-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-[12px] font-medium">
          +{formatBRL(hoje.sobreAMeta)} acima da meta diária — entra no seu saldo de meta.
        </p>
      )}

      <p className="mt-2 text-[10px] opacity-75">
        Premissa: {formatBRL(rendaHora)}/h informados por você — estimativa, não é rendimento real.
      </p>

      {/* Módulo 18 — encerrar dia (correção continua livre no calendário) */}
      {hoje.status !== 'encerrado' ? (
        encerrando ? (
          <div className="mt-2 space-y-2 rounded-xl bg-white/10 p-3">
            <div className="grid grid-cols-2 gap-2">
              <input autoFocus className="h-10 rounded-xl border-0 bg-white/90 px-3 text-sm text-neutral-900 placeholder:text-neutral-500" placeholder="Ganho do dia (R$)" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
              <input className="h-10 rounded-xl border-0 bg-white/90 px-3 text-sm text-neutral-900 placeholder:text-neutral-500" placeholder="Horas (opcional)" inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="button" className="flex-1 rounded-xl bg-white/20 py-2 text-sm" onClick={() => setEncerrando(false)}>Cancelar</button>
              <button type="button" disabled={salvando} className="flex-1 rounded-xl bg-white py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50" onClick={salvar}>
                Encerrar dia
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="mt-2 w-full rounded-xl bg-white/15 py-2.5 text-sm font-semibold" onClick={() => setEncerrando(true)}>
            Encerrar dia
          </button>
        )
      ) : (
        <p className="mt-2 text-center text-[11px] opacity-80">Dia encerrado — dá pra corrigir depois pelo calendário.</p>
      )}
    </section>
  );
}
