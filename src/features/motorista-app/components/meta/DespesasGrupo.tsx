import { useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Secao, Pill } from '../ui';
import {
  CATEGORIA_LABEL,
  explicarConversao,
  formatBRL,
  normalizarMensal,
  PERIODICIDADE_LABEL,
  type DespesaMeta,
  type GrupoDespesa,
  type PeriodicidadeDespesa,
} from '../../lib/metas';

// Bloco expansível de um grupo de despesas (Módulos 4–8): subtotal clicável → composição +
// cadastro simples (nunca planilha). Conversão de periodicidade SEMPRE explicada (Módulo 9).

const PERIODICIDADES: PeriodicidadeDespesa[] = ['mensal', 'semanal', 'quinzenal', 'anual', 'diaria'];

export function DespesasGrupo({
  titulo,
  grupo,
  subtotal,
  despesas,
  categorias,
  comDependente,
  itemFixo,
  onCriar,
  onAtualizar,
  onRemover,
  salvando,
}: {
  titulo: string;
  grupo: GrupoDespesa;
  subtotal: number;
  despesas: (DespesaMeta & { vencimento_dia?: number | null })[];
  categorias: readonly string[];
  comDependente?: boolean;
  /** linha derivada do RodaVolt (aluguel do contrato) — não editável, nunca duplicada */
  itemFixo?: { nome: string; valorMensal: number; origem: string } | null;
  onCriar: (d: { grupo: GrupoDespesa; categoria: string; nome: string; dependente?: string | null; valor: number; periodicidade: PeriodicidadeDespesa }) => void;
  onAtualizar: (id: string, patch: Partial<DespesaMeta>) => void;
  onRemover: (id: string) => void;
  salvando: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ categoria: categorias[0] as string, nome: '', dependente: '', valor: '', periodicidade: 'mensal' as PeriodicidadeDespesa });

  const doGrupo = despesas.filter((d) => d.grupo === grupo);
  const valorNum = Number(form.valor.replace(',', '.'));
  const conversao = Number.isFinite(valorNum) && valorNum > 0 ? explicarConversao(valorNum, form.periodicidade) : null;

  const salvar = () => {
    if (!Number.isFinite(valorNum) || valorNum <= 0) return;
    onCriar({
      grupo,
      categoria: form.categoria,
      nome: form.nome.trim() || CATEGORIA_LABEL[form.categoria] || form.categoria,
      dependente: comDependente ? form.dependente.trim() || null : null,
      valor: valorNum,
      periodicidade: form.periodicidade,
    });
    setForm({ categoria: categorias[0] as string, nome: '', dependente: '', valor: '', periodicidade: 'mensal' });
    setNovo(false);
  };

  return (
    <Secao>
      <button type="button" className="flex w-full items-center justify-between" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{titulo}</span>
        <span className="flex items-center gap-2">
          <span className="text-base font-bold text-neutral-900 dark:text-white">{formatBRL(subtotal)}<span className="text-xs font-normal text-neutral-400">/mês</span></span>
          <ChevronDown className={cn('h-4 w-4 text-neutral-400 transition-transform', aberto && 'rotate-180')} aria-hidden />
        </span>
      </button>

      {aberto && (
        <div className="mt-3 space-y-2">
          {itemFixo && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{itemFixo.nome}</p>
                <p className="text-[11px] text-neutral-500">{itemFixo.origem}</p>
              </div>
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{formatBRL(itemFixo.valorMensal)}/mês</span>
            </div>
          )}
          {doGrupo.length === 0 && !itemFixo && <p className="py-1 text-sm text-neutral-400">Nada cadastrado ainda.</p>}
          {doGrupo.map((d) => (
            <div key={d.id} className={cn('flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2 dark:border-white/10', !d.ativa && 'opacity-50')}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  {d.nome}
                  {d.dependente && <span className="ml-1 text-xs text-neutral-400">· {d.dependente}</span>}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {formatBRL(d.valor)} {PERIODICIDADE_LABEL[d.periodicidade]}
                  {d.periodicidade !== 'mensal' && ` → ${formatBRL(normalizarMensal(d.valor, d.periodicidade))}/mês`}
                  {!d.obrigatoria && ' · opcional'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
                  onClick={() => onAtualizar(d.id, { ativa: !d.ativa })}
                >
                  {d.ativa ? 'Pausar' : 'Ativar'}
                </button>
                <button type="button" aria-label={`Remover ${d.nome}`} className="text-neutral-300 hover:text-red-500" onClick={() => onRemover(d.id)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}

          {novo ? (
            <div className="space-y-2 rounded-xl border border-dashed border-neutral-300 p-3 dark:border-white/20">
              <div className="grid grid-cols-2 gap-2">
                <select className="h-10 rounded-xl border border-neutral-200 bg-transparent px-2 text-sm dark:border-white/10" value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
                  {categorias.map((c) => (
                    <option key={c} value={c}>{CATEGORIA_LABEL[c] ?? c}</option>
                  ))}
                </select>
                <select className="h-10 rounded-xl border border-neutral-200 bg-transparent px-2 text-sm dark:border-white/10" value={form.periodicidade} onChange={(e) => setForm((f) => ({ ...f, periodicidade: e.target.value as PeriodicidadeDespesa }))}>
                  {PERIODICIDADES.map((p) => (
                    <option key={p} value={p}>{PERIODICIDADE_LABEL[p]}</option>
                  ))}
                </select>
              </div>
              {comDependente && (
                <input className="h-10 w-full rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Para quem? (nome/apelido)" value={form.dependente} onChange={(e) => setForm((f) => ({ ...f, dependente: e.target.value }))} />
              )}
              <div className="grid grid-cols-2 gap-2">
                <input className="h-10 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Nome (opcional)" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
                <input className="h-10 rounded-xl border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10" placeholder="Valor (R$)" inputMode="decimal" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} />
              </div>
              {conversao && <p className="text-[11px] text-neutral-500">{conversao}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-xl px-3 py-2 text-sm text-neutral-500" onClick={() => setNovo(false)}>Cancelar</button>
                <button type="button" disabled={salvando || !Number.isFinite(valorNum) || valorNum <= 0} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={salvar}>
                  Adicionar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 py-2.5 text-sm font-medium text-emerald-600 dark:border-white/20" onClick={() => setNovo(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Adicionar despesa
            </button>
          )}

          {comDependente && doGrupo.length > 0 && (
            <p className="pt-1 text-right text-[11px] text-neutral-400">
              <Pill tom="neutro">Custo da família: {formatBRL(subtotal)}/mês</Pill>
            </p>
          )}
        </div>
      )}
    </Secao>
  );
}
