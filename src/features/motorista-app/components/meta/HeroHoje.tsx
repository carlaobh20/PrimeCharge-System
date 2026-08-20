import { useState } from 'react';
import { Minus, Moon, Sunrise, TrendingDown, TrendingUp } from 'lucide-react';
import {
  APP_LABEL,
  APPS_DIARIO,
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
  onEncerrarDia: (dados: {
    valor: number;
    horas: number | null;
    km_inicio: number | null;
    km_fim: number | null;
    corridas: number | null;
    apps: string[] | null;
  }) => void;
  salvando: boolean;
}) {
  const [encerrando, setEncerrando] = useState(false);
  const [detalhes, setDetalhes] = useState(false);
  const [valor, setValor] = useState('');
  const [horas, setHoras] = useState('');
  const [kmIni, setKmIni] = useState('');
  const [kmFim, setKmFim] = useState('');
  const [corridas, setCorridas] = useState('');
  const [apps, setApps] = useState<string[]>([]);
  const Icone = ICONE_STATUS[hoje.status];

  const num = (s: string) => {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 && s.trim() !== '' ? n : null;
  };
  const kmIniNum = num(kmIni);
  const kmFimNum = num(kmFim);
  const kmInvalido = kmIniNum != null && kmFimNum != null && kmFimNum < kmIniNum;

  const salvar = () => {
    const v = Number(valor.replace(',', '.'));
    if (!Number.isFinite(v) || v < 0 || kmInvalido) return;
    const h = Number(horas.replace(',', '.'));
    const c = num(corridas);
    onEncerrarDia({
      valor: v,
      horas: Number.isFinite(h) && h > 0 ? h : null,
      km_inicio: kmIniNum,
      km_fim: kmFimNum,
      corridas: c != null ? Math.floor(c) : null,
      apps: apps.length > 0 ? apps : null,
    });
    setEncerrando(false);
    setDetalhes(false);
    setValor(''); setHoras(''); setKmIni(''); setKmFim(''); setCorridas(''); setApps([]);
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
            {/* Fase 12.1 — diário OPCIONAL (nunca burocrático: fica atrás de um toque) */}
            {detalhes ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className="h-10 rounded-xl border-0 bg-white/90 px-3 text-sm text-neutral-900 placeholder:text-neutral-500" placeholder="Odômetro inicial (km)" inputMode="decimal" value={kmIni} onChange={(e) => setKmIni(e.target.value)} />
                  <input className="h-10 rounded-xl border-0 bg-white/90 px-3 text-sm text-neutral-900 placeholder:text-neutral-500" placeholder="Odômetro final (km)" inputMode="decimal" value={kmFim} onChange={(e) => setKmFim(e.target.value)} />
                </div>
                {kmInvalido && <p className="text-[11px] font-medium text-amber-200">Odômetro final não pode ser menor que o inicial.</p>}
                {(kmIniNum == null) !== (kmFimNum == null) && <p className="text-[11px] opacity-80">KM INCOMPLETO — com um só odômetro os km rodados não são calculados.</p>}
                <input className="h-10 w-full rounded-xl border-0 bg-white/90 px-3 text-sm text-neutral-900 placeholder:text-neutral-500" placeholder="Nº de corridas (opcional)" inputMode="numeric" value={corridas} onChange={(e) => setCorridas(e.target.value)} />
                <div className="flex flex-wrap gap-1.5">
                  {APPS_DIARIO.map((a) => (
                    <button key={a} type="button" aria-pressed={apps.includes(a)} className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${apps.includes(a) ? 'bg-white text-emerald-700' : 'bg-white/20'}`} onClick={() => setApps((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))}>
                      {APP_LABEL[a]}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button type="button" className="w-full rounded-xl bg-white/15 py-2 text-[12px]" onClick={() => setDetalhes(true)}>
                + Detalhes do dia (km, corridas, apps — opcional)
              </button>
            )}
            <div className="flex gap-2">
              <button type="button" className="flex-1 rounded-xl bg-white/20 py-2 text-sm" onClick={() => { setEncerrando(false); setDetalhes(false); }}>Cancelar</button>
              <button type="button" disabled={salvando || kmInvalido} className="flex-1 rounded-xl bg-white py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50" onClick={salvar}>
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
