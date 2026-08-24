import { useState } from 'react';
import { Plus, Zap } from 'lucide-react';
import { Secao } from '../ui';
import { APP_LABEL, APPS_DIARIO, formatBRL } from '../../lib/metas';
import type { GanhoRow, RecargaRow } from '../../api/financasPessoais';

// FASE 23 — GANHOS E GASTOS DE HOJE (compacto, ≤3-4 toques). Reusa os MESMOS dados/mutations do
// Hero/Recargas (motorista_ganhos tem 1 linha/dia — UNIQUE(motorista_id,data) — e motorista_
// recargas é evento por evento). NÃO existe hoje coluna de valor por plataforma (Uber/99/Outro):
// "apps" é só a lista de plataformas usadas no dia, sem valor individual — por isso mostramos só
// os apps marcados, sem inventar uma divisão de R$ que o banco não guarda (ver relatório, gap
// documentado para migration futura). "Registrar ganho" faz upsert do TOTAL do dia preservando
// horas/km/corridas/observação já lançados (nunca apaga o que já existe).

export function GanhosGastosHojeCard({
  faturamentoHoje,
  ganhoHoje,
  gastosHoje,
  recargasHoje,
  onRegistrarGanho,
  onRegistrarRecarga,
  salvandoGanho,
  salvandoRecarga,
}: {
  faturamentoHoje: number | null;
  ganhoHoje: GanhoRow | null;
  gastosHoje: number;
  recargasHoje: RecargaRow[];
  onRegistrarGanho: (dados: { valor: number; apps: string[] | null }) => void;
  onRegistrarRecarga: (r: { custo: number }) => void;
  salvandoGanho: boolean;
  salvandoRecarga: boolean;
}) {
  const [editandoGanho, setEditandoGanho] = useState(false);
  const [valor, setValor] = useState('');
  const [apps, setApps] = useState<string[]>(ganhoHoje?.apps ?? []);
  const [editandoGasto, setEditandoGasto] = useState(false);
  const [custo, setCusto] = useState('');

  const abrirEdicaoGanho = () => {
    setValor(faturamentoHoje != null ? String(faturamentoHoje).replace('.', ',') : '');
    setApps(ganhoHoje?.apps ?? []);
    setEditandoGanho(true);
  };

  const salvarGanho = () => {
    const v = Number(valor.replace(',', '.'));
    if (!Number.isFinite(v) || v < 0) return;
    onRegistrarGanho({ valor: v, apps: apps.length > 0 ? apps : null });
    setEditandoGanho(false);
  };

  const salvarGasto = () => {
    const c = Number(custo.replace(',', '.'));
    if (!Number.isFinite(c) || c <= 0) return;
    onRegistrarRecarga({ custo: c });
    setCusto('');
    setEditandoGasto(false);
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Secao titulo="Ganhos de hoje">
        <p className="text-2xl font-extrabold text-neutral-900 dark:text-white">
          {faturamentoHoje != null ? formatBRL(faturamentoHoje) : '—'}
        </p>
        {ganhoHoje?.apps && ganhoHoje.apps.length > 0 && (
          <p className="mt-0.5 text-[11px] text-neutral-500">{ganhoHoje.apps.map((a) => APP_LABEL[a] ?? a).join(' · ')}</p>
        )}
        {editandoGanho ? (
          <div className="mt-2 space-y-2 rounded-xl border border-dashed border-neutral-300 p-2.5 dark:border-white/20">
            <input
              autoFocus
              className="h-10 w-full rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10"
              placeholder="Total ganho hoje (R$)"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {APPS_DIARIO.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={apps.includes(a)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${apps.includes(a) ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300'}`}
                  onClick={() => setApps((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))}
                >
                  {APP_LABEL[a]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" className="flex-1 rounded-xl py-2 text-sm text-neutral-500" onClick={() => setEditandoGanho(false)}>Cancelar</button>
              <button type="button" disabled={salvandoGanho} className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={salvarGanho}>
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 py-2 text-sm font-medium text-emerald-600 dark:border-white/20" onClick={abrirEdicaoGanho}>
            <Plus className="h-4 w-4" aria-hidden /> {faturamentoHoje != null ? 'Atualizar' : 'Registrar'} ganho
          </button>
        )}
      </Secao>

      <Secao titulo="Gastos de hoje">
        <p className="text-2xl font-extrabold text-neutral-900 dark:text-white">{formatBRL(gastosHoje)}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
          <Zap className="h-3 w-3" aria-hidden /> {recargasHoje.length > 0 ? `${recargasHoje.length} recarga(s) hoje` : 'Só recargas de energia (única fonte de gasto diário hoje)'}
        </p>
        {editandoGasto ? (
          <div className="mt-2 flex gap-2 rounded-xl border border-dashed border-neutral-300 p-2.5 dark:border-white/20">
            <input
              autoFocus
              className="h-10 flex-1 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10"
              placeholder="Custo da recarga (R$)"
              inputMode="decimal"
              value={custo}
              onChange={(e) => setCusto(e.target.value)}
            />
            <button type="button" disabled={salvandoRecarga} className="rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50" onClick={salvarGasto}>
              OK
            </button>
          </div>
        ) : (
          <button type="button" className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 py-2 text-sm font-medium text-emerald-600 dark:border-white/20" onClick={() => setEditandoGasto(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Registrar recarga
          </button>
        )}
      </Secao>
    </div>
  );
}
