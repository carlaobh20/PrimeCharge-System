import { useState } from 'react';
import { Clock, Fuel, Gauge, Moon, PlayCircle, Wallet } from 'lucide-react';
import { Secao, Linha, Pill } from '../ui';
import {
  ESTADO_DIA_LABEL,
  formatBRL,
  formatHoras,
  type EstadoDoDia,
  type ItemRevisao,
  type MetaHojeCockpit,
  type ResumoDiaOperacional,
} from '../../lib/metas';

// ROTINA DO DIA (Fase 14, Módulos 1–12) — o ciclo inteiro numa área só:
// ABRIR → REGISTRAR (ganho / km / recarga) → ACOMPANHAR → ENCERRAR (com revisão) → CONSULTAR.
// "Começar registro" NÃO cria linha vazia no banco: só abre o formulário (Módulo 2).
// Nada é obrigatório além do que o schema exige. Avisos nunca bloqueiam o encerramento.

const ICONE_ESTADO: Record<EstadoDoDia, typeof Clock> = {
  sem_dados: Clock,
  nao_comecou: PlayCircle,
  em_andamento: Clock,
  dados_parciais: Clock,
  pronto_para_encerrar: Gauge,
  encerrado: Moon,
};

type Aba = null | 'ganho' | 'km' | 'recarga' | 'encerrar';

export function RotinaDoDiaCard({
  estado,
  hoje,
  resumo,
  revisao,
  horasPremissa,
  horasHistorico,
  onSalvarGanho,
  onSalvarKm,
  onSalvarRecarga,
  onEncerrar,
  salvando,
}: {
  estado: EstadoDoDia;
  hoje: MetaHojeCockpit;
  resumo: ResumoDiaOperacional | null;
  revisao: ItemRevisao[];
  horasPremissa: number | null;
  horasHistorico: number | null;
  onSalvarGanho: (d: { valor: number; horas: number | null }) => void;
  onSalvarKm: (d: { km_inicio: number | null; km_fim: number | null; corridas: number | null }) => void;
  onSalvarRecarga: (d: { custo: number; kwh: number | null; pct_inicial: number | null; pct_final: number | null; local: string | null }) => void;
  onEncerrar: () => void;
  salvando: boolean;
}) {
  const [aba, setAba] = useState<Aba>(null);
  const [g, setG] = useState({ valor: '', horas: '' });
  const [k, setK] = useState({ ini: '', fim: '', corridas: '' });
  const [r, setR] = useState({ custo: '', kwh: '', pi: '', pf: '', local: '' });
  const Icone = ICONE_ESTADO[estado];

  const num = (s: string) => {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) && s.trim() !== '' ? n : null;
  };
  const kmIni = num(k.ini);
  const kmFim = num(k.fim);
  const kmInvalido = kmIni != null && kmFim != null && kmFim < kmIni;
  const kmRodados = kmIni != null && kmFim != null && !kmInvalido ? Math.round((kmFim - kmIni) * 10) / 10 : null;
  const kmParcial = (kmIni == null) !== (kmFim == null);

  const tom = estado === 'encerrado' ? 'azul' : estado === 'pronto_para_encerrar' ? 'verde' : estado === 'sem_dados' ? 'neutro' : 'ambar';

  return (
    <Secao titulo="Meu dia" acao={<Pill tom={tom}>{ESTADO_DIA_LABEL[estado]}</Pill>}>
      {/* ===== ABRIR O DIA (Módulo 2) — sem registro ainda ===== */}
      {(estado === 'nao_comecou' || estado === 'sem_dados') && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-emerald-600 p-2 text-white">
              <p className="text-[9px] uppercase tracking-wide opacity-80">Meta de hoje</p>
              <p className="text-base font-extrabold">{formatBRL(hoje.metaHoje)}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
              <p className="text-[9px] uppercase tracking-wide text-neutral-400">Horas · PREMISSA</p>
              <p className="text-base font-bold text-neutral-900 dark:text-white">{horasPremissa != null ? formatHoras(horasPremissa) : '—'}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
              <p className="text-[9px] uppercase tracking-wide text-neutral-400">Horas · HISTÓRICO</p>
              <p className="text-base font-bold text-neutral-900 dark:text-white">{horasHistorico != null ? formatHoras(horasHistorico) : 'SEM DADO'}</p>
            </div>
          </div>
          <p className="mt-1 text-[9px] text-neutral-400">
            Nada foi registrado hoje ainda. Abrir o registro não grava nada — só abre o formulário.
          </p>
        </>
      )}

      {/* ===== ACOMPANHAR (Módulos 8/9) — já existe registro ===== */}
      {resumo && estado !== 'nao_comecou' && estado !== 'sem_dados' && (
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {([
            ['Realizado', formatBRL(resumo.ganho)],
            ['Meta', formatBRL(hoje.metaHoje)],
            ['Falta', hoje.faltanteHoje != null ? formatBRL(hoje.faltanteHoje) : '—'],
            ['R$/h', resumo.rph != null ? formatBRL(resumo.rph) : 'SEM DADO'],
            ['Horas', resumo.horas != null ? formatHoras(resumo.horas) : 'SEM DADO'],
            ['Km', resumo.kmRodados != null ? `${resumo.kmRodados}` : resumo.kmIncompleto ? 'INCOMPL.' : 'SEM DADO'],
            ['Corridas', resumo.corridas != null ? String(resumo.corridas) : 'SEM DADO'],
            ['Recargas', formatBRL(resumo.custoRecargasDia)],
          ] as const).map(([rot, val]) => (
            <div key={rot} className="rounded-xl bg-neutral-50 p-1.5 dark:bg-white/5">
              <p className="text-[9px] uppercase tracking-wide text-neutral-400">{rot}</p>
              <p className="text-[12px] font-bold text-neutral-900 dark:text-white">{val}</p>
            </div>
          ))}
        </div>
      )}

      {hoje.horasRestantes != null && hoje.faltanteHoje != null && hoje.faltanteHoje > 0 && (
        <p className="mt-1.5 text-[11px] text-neutral-500">
          Faltam {formatBRL(hoje.faltanteHoje)} ≈ {formatHoras(hoje.horasRestantes)} pela PREMISSA
          {horasHistorico != null && hoje.metaHoje > 0 && ` · pelo seu HISTÓRICO seria diferente (ver Plano de hoje)`}.
        </p>
      )}

      {/* ===== DIA ENCERRADO (Módulo 12) ===== */}
      {estado === 'encerrado' && (
        <p className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-[11px] text-neutral-500 dark:bg-white/5">
          <Icone className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Dia encerrado. Os dados continuam disponíveis para consulta — e você pode corrigir qualquer lançamento pelo calendário.
        </p>
      )}

      {/* ===== REGISTRAR (Módulo 4) ===== */}
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Registrar</p>
        <div className="mt-1 grid grid-cols-4 gap-1.5">
          {([
            ['ganho', 'Ganho', Wallet],
            ['km', 'KM', Gauge],
            ['recarga', 'Recarga', Fuel],
            ['encerrar', estado === 'encerrado' ? 'Revisar' : 'Encerrar', Moon],
          ] as const).map(([id, rotulo, Ic]) => (
            <button
              key={id}
              type="button"
              aria-pressed={aba === id}
              onClick={() => setAba(aba === id ? null : (id as Aba))}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border text-[11px] font-medium ${aba === id ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-300'}`}
            >
              <Ic className="h-4 w-4" aria-hidden />
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* ===== formulário mínimo de cada ação ===== */}
      {aba === 'ganho' && (
        <div className="mt-2 space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-white/10">
          <div className="grid grid-cols-2 gap-2">
            <input autoFocus className="h-11 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Ganho do dia (R$)" inputMode="decimal" value={g.valor} onChange={(e) => setG((v) => ({ ...v, valor: e.target.value }))} />
            <input className="h-11 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Horas (opcional)" inputMode="decimal" value={g.horas} onChange={(e) => setG((v) => ({ ...v, horas: e.target.value }))} />
          </div>
          <button type="button" disabled={salvando || num(g.valor) == null} className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => { const v = num(g.valor); if (v == null) return; onSalvarGanho({ valor: v, horas: num(g.horas) }); setG({ valor: '', horas: '' }); setAba(null); }}>
            Salvar ganho
          </button>
          <p className="text-[9px] text-neutral-400">Um registro por dia: salvar de novo corrige o mesmo dia, não cria outro.</p>
        </div>
      )}

      {aba === 'km' && (
        <div className="mt-2 space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-white/10">
          <div className="grid grid-cols-2 gap-2">
            <input autoFocus className="h-11 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Odômetro inicial" inputMode="decimal" value={k.ini} onChange={(e) => setK((v) => ({ ...v, ini: e.target.value }))} />
            <input className="h-11 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Odômetro final" inputMode="decimal" value={k.fim} onChange={(e) => setK((v) => ({ ...v, fim: e.target.value }))} />
          </div>
          <input className="h-11 w-full rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Nº de corridas (opcional)" inputMode="numeric" value={k.corridas} onChange={(e) => setK((v) => ({ ...v, corridas: e.target.value }))} />
          {kmRodados != null && <p className="text-[12px] font-medium text-emerald-600">KM RODADOS: {kmRodados} km</p>}
          {kmParcial && <p className="text-[11px] text-neutral-500">KM INCOMPLETO — com um odômetro só, os km não são calculados.</p>}
          {kmInvalido && <p className="text-[11px] font-medium text-amber-600">O odômetro final não pode ser menor que o inicial.</p>}
          <button type="button" disabled={salvando || kmInvalido || (kmIni == null && kmFim == null && num(k.corridas) == null)} className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => { const c = num(k.corridas); onSalvarKm({ km_inicio: kmIni, km_fim: kmFim, corridas: c != null ? Math.floor(c) : null }); setK({ ini: '', fim: '', corridas: '' }); setAba(null); }}>
            Salvar KM
          </button>
          <p className="text-[9px] text-neutral-400">Registro pessoal seu — nunca altera o odômetro do veículo no PrimeCharge.</p>
        </div>
      )}

      {aba === 'recarga' && (
        <div className="mt-2 space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-white/10">
          <div className="grid grid-cols-2 gap-2">
            <input autoFocus className="h-11 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Custo (R$)" inputMode="decimal" value={r.custo} onChange={(e) => setR((v) => ({ ...v, custo: e.target.value }))} />
            <input className="h-11 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="kWh (opcional)" inputMode="decimal" value={r.kwh} onChange={(e) => setR((v) => ({ ...v, kwh: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="h-11 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Bat. %" inputMode="numeric" value={r.pi} onChange={(e) => setR((v) => ({ ...v, pi: e.target.value }))} />
            <input className="h-11 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Bat. final %" inputMode="numeric" value={r.pf} onChange={(e) => setR((v) => ({ ...v, pf: e.target.value }))} />
            <input className="h-11 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Local" value={r.local} onChange={(e) => setR((v) => ({ ...v, local: e.target.value }))} />
          </div>
          <button type="button" disabled={salvando || num(r.custo) == null} className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => { const c = num(r.custo); if (c == null) return; const pi = num(r.pi), pf = num(r.pf);
              onSalvarRecarga({ custo: c, kwh: num(r.kwh), pct_inicial: pi != null && pi >= 0 && pi <= 100 ? pi : null, pct_final: pf != null && pf >= 0 && pf <= 100 ? pf : null, local: r.local.trim() || null });
              setR({ custo: '', kwh: '', pi: '', pf: '', local: '' }); setAba(null); }}>
            Salvar recarga
          </button>
          <p className="text-[9px] text-neutral-400">Cada recarga é um evento independente. Só o custo é obrigatório.</p>
        </div>
      )}

      {/* ===== ENCERRAMENTO com revisão (Módulos 10/11) ===== */}
      {aba === 'encerrar' && (
        <div className="mt-2 space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Resumo do seu dia</p>
          {resumo ? (
            <div>
              <Linha label="Ganho" value={formatBRL(resumo.ganho)} />
              <Linha label="Horas" value={resumo.horas != null ? formatHoras(resumo.horas) : 'NÃO INFORMADO'} />
              <Linha label="R$/h" value={resumo.rph != null ? formatBRL(resumo.rph) : 'NÃO INFORMADO'} />
              <Linha label="KM" value={resumo.kmRodados != null ? `${resumo.kmRodados} km` : resumo.kmIncompleto ? 'KM INCOMPLETO' : 'NÃO INFORMADO'} />
              <Linha label="R$/km" value={resumo.rpkm != null ? formatBRL(resumo.rpkm) : 'NÃO INFORMADO'} />
              <Linha label="Corridas · R$/corrida" value={resumo.corridas != null ? `${resumo.corridas} · ${resumo.rpCorrida != null ? formatBRL(resumo.rpCorrida) : '—'}` : 'NÃO INFORMADO'} />
              <Linha label="Custo operacional registrado" value={formatBRL(resumo.custoRecargasDia)} />
              <Linha label="Resultado operacional registrado" value={`${resumo.resultadoOperacional >= 0 ? '+' : '−'}${formatBRL(Math.abs(resumo.resultadoOperacional))}`} />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Nenhum dado registrado hoje ainda.</p>
          )}

          <div className="space-y-0.5 border-t border-neutral-100 pt-2 dark:border-white/10">
            {revisao.map((item) => (
              <p key={item.rotulo} className={`text-[12px] ${item.ok ? 'text-emerald-600' : 'text-neutral-500'}`}>
                {item.ok ? '✓' : '⚠'} {item.rotulo}
              </p>
            ))}
            <p className="pt-0.5 text-[9px] text-neutral-400">Avisos são só informativos — campos opcionais não impedem o encerramento.</p>
          </div>

          <div className="flex gap-2">
            <button type="button" className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm text-neutral-600 dark:border-white/10 dark:text-neutral-300" onClick={() => setAba(null)}>
              Voltar e completar
            </button>
            <button type="button" disabled={salvando} className="flex-1 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
              onClick={() => { onEncerrar(); setAba(null); }}>
              {estado === 'encerrado' ? 'Registrar de novo' : 'Encerrar mesmo assim'}
            </button>
          </div>
        </div>
      )}
    </Secao>
  );
}
