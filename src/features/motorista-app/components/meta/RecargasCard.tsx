import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Secao, Linha } from '../ui';
import { formatBRL } from '../../lib/metas';
import type { RecargaRow } from '../../api/financasPessoais';

// RECARGAS (Fase 12.1) — eventos individuais, SEPARADOS da despesa recorrente. Quando os dois
// existem, a divergência aparece com escolha explícita (MANTER × PAUSAR a recorrência) — nada
// muda sozinho. Cada evento é independente (duas recargas no dia = dois registros).

export function RecargasCard({
  recargas,
  custoRegistrado30,
  divergencia,
  onCriar,
  onRemover,
  onPausarRecorrencia,
  salvando,
}: {
  recargas: RecargaRow[];
  custoRegistrado30: number;
  divergencia: { despesaId: string; recorrenciaMensal: number; eventos30: number } | null;
  onCriar: (r: { data: string; custo: number; kwh: number | null; pct_inicial: number | null; pct_final: number | null; local: string | null }) => void;
  onRemover: (id: string) => void;
  onPausarRecorrencia: (despesaId: string) => void;
  salvando: boolean;
}) {
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ data: new Date().toISOString().slice(0, 10), custo: '', kwh: '', pctIni: '', pctFim: '', local: '' });
  const num = (s: string) => {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) && s.trim() !== '' ? n : null;
  };

  const salvar = () => {
    const custo = num(form.custo);
    if (custo == null || custo < 0 || salvando) return; // guard de retry: botão desabilitado enquanto salva
    const pi = num(form.pctIni);
    const pf = num(form.pctFim);
    onCriar({
      data: form.data,
      custo,
      kwh: num(form.kwh),
      pct_inicial: pi != null && pi >= 0 && pi <= 100 ? pi : null,
      pct_final: pf != null && pf >= 0 && pf <= 100 ? pf : null,
      local: form.local.trim() || null,
    });
    setForm({ data: new Date().toISOString().slice(0, 10), custo: '', kwh: '', pctIni: '', pctFim: '', local: '' });
    setNovo(false);
  };

  return (
    <Secao titulo="Recargas registradas">
      <Linha label="Custo operacional registrado (30 dias)" value={formatBRL(custoRegistrado30)} />

      {/* Divergência recorrência × eventos — escolha do motorista, nunca automática */}
      {divergencia && (
        <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] dark:bg-amber-500/10">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            Você possui uma despesa recorrente de recarga/combustível e também registros individuais.
          </p>
          <Linha label="DESPESA RECORRENTE" value={`${formatBRL(divergencia.recorrenciaMensal)}/mês`} />
          <Linha label="RECARGAS REGISTRADAS (30d)" value={formatBRL(divergencia.eventos30)} />
          <div className="mt-1.5 flex gap-2">
            <button type="button" className="flex-1 rounded-xl border border-amber-300 py-2 text-[12px] font-medium text-amber-800 dark:text-amber-300" onClick={() => { /* manter = não fazer nada */ }}>
              Manter recorrência
            </button>
            <button type="button" className="flex-1 rounded-xl bg-amber-600 py-2 text-[12px] font-semibold text-white" onClick={() => onPausarRecorrencia(divergencia.despesaId)}>
              Pausar recorrência
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 space-y-1.5">
        {recargas.length === 0 && <p className="text-sm text-neutral-400">Nenhuma recarga registrada ainda.</p>}
        {recargas.slice(0, 8).map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2 dark:border-white/10">
            <div className="min-w-0 text-[12px]">
              <p className="font-medium text-neutral-800 dark:text-neutral-100">
                {r.data.slice(8, 10)}/{r.data.slice(5, 7)} · {formatBRL(r.custo)}
              </p>
              <p className="text-[11px] text-neutral-500">
                {r.kwh != null ? `${r.kwh} kWh` : 'kWh NÃO INFORMADO'}
                {r.pct_inicial != null && r.pct_final != null && ` · ${r.pct_inicial}% → ${r.pct_final}%`}
                {r.local && ` · ${r.local}`}
              </p>
            </div>
            <button type="button" aria-label="Remover recarga" className="text-neutral-300 hover:text-red-500" onClick={() => onRemover(r.id)}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      {novo ? (
        <div className="mt-2 space-y-2 rounded-xl border border-dashed border-neutral-300 p-3 dark:border-white/20">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="h-10 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
            <input className="h-10 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Custo (R$)" inputMode="decimal" value={form.custo} onChange={(e) => setForm((f) => ({ ...f, custo: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="h-10 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="kWh (opc.)" inputMode="decimal" value={form.kwh} onChange={(e) => setForm((f) => ({ ...f, kwh: e.target.value }))} />
            <input className="h-10 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Bat. inicial %" inputMode="numeric" value={form.pctIni} onChange={(e) => setForm((f) => ({ ...f, pctIni: e.target.value }))} />
            <input className="h-10 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Bat. final %" inputMode="numeric" value={form.pctFim} onChange={(e) => setForm((f) => ({ ...f, pctFim: e.target.value }))} />
          </div>
          <input className="h-10 w-full rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Local (opcional)" value={form.local} onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-xl px-3 py-2 text-sm text-neutral-500" onClick={() => setNovo(false)}>Cancelar</button>
            <button type="button" disabled={salvando || num(form.custo) == null} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={salvar}>
              Salvar recarga
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 py-2.5 text-sm font-medium text-emerald-600 dark:border-white/20" onClick={() => setNovo(true)}>
          <Plus className="h-4 w-4" aria-hidden /> Adicionar recarga
        </button>
      )}
    </Secao>
  );
}
