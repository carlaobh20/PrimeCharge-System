import { useState } from 'react';
import { Minus, TrendingDown, TrendingUp, HelpCircle } from 'lucide-react';
import { Secao, Pill } from '../ui';
import { formatBRL, type StatusMetaLiquidaDia } from '../../lib/metas';

// FASE 23 — VISÃO RÁPIDA DO DIA (topo da tela, substitui a leitura mental antiga de
// "faturamento = meta"). Mostra META LÍQUIDA × FEITO (líquido) × GASTOS × FALTA, nunca chama
// faturamento de "líquido" e nunca chama líquido de "lucro" (ferramenta de organização pessoal).
// Nada aqui é recalculado no componente — todo número já vem pronto de lib/metas.ts.

const TOM_STATUS: Record<StatusMetaLiquidaDia, 'neutro' | 'ambar' | 'verde'> = {
  sem_dado: 'neutro',
  abaixo: 'ambar',
  atingida: 'verde',
  superada: 'verde',
};

const ICONE_STATUS: Record<StatusMetaLiquidaDia, typeof Minus> = {
  sem_dado: Minus,
  abaixo: TrendingDown,
  atingida: TrendingUp,
  superada: TrendingUp,
};

export function VisaoRapidaCard({
  metaLiquida,
  faturamento,
  gastos,
  liquido,
  falta,
  progresso,
  status,
  texto,
  calcularAindaPrecisoFaturar,
}: {
  metaLiquida: number;
  faturamento: number | null;
  gastos: number;
  liquido: number | null;
  falta: number;
  progresso: number;
  status: StatusMetaLiquidaDia;
  texto: string;
  calcularAindaPrecisoFaturar: (gastosPrevistos?: number) => number;
}) {
  const [gastosPrevistos, setGastosPrevistos] = useState('');
  const Icone = ICONE_STATUS[status];
  const previstoNum = (() => {
    const n = Number(gastosPrevistos.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })();
  const precisoFaturar = calcularAindaPrecisoFaturar(previstoNum);
  const pctBarra = Math.max(0, Math.min(100, progresso));

  return (
    <Secao className="bg-emerald-600 !border-0 text-white dark:bg-emerald-600">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Meta líquida de hoje</p>
        <Pill tom={TOM_STATUS[status]}>
          <Icone className="mr-1 inline h-3 w-3" aria-hidden />
          {status === 'sem_dado' ? 'Sem dado' : status === 'abaixo' ? 'Abaixo' : status === 'atingida' ? 'Atingida' : 'Superada'}
        </Pill>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/70">Meta</p>
          <p className="text-xl font-extrabold">{formatBRL(metaLiquida)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-white/70">Líquido feito</p>
          <p className="text-xl font-extrabold">{liquido != null ? formatBRL(liquido) : '—'}</p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
        <div className="rounded-xl bg-white/10 px-2.5 py-1.5">
          <span className="text-white/70">Faturado: </span>
          <span className="font-semibold">{faturamento != null ? formatBRL(faturamento) : 'SEM DADO'}</span>
        </div>
        <div className="rounded-xl bg-white/10 px-2.5 py-1.5 text-right">
          <span className="text-white/70">Gastos: </span>
          <span className="font-semibold">{formatBRL(gastos)}</span>
        </div>
      </div>

      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/15" role="img" aria-label={`${pctBarra}% da meta líquida do dia`}>
        <div className="h-full rounded-full bg-white" style={{ width: `${pctBarra}%` }} />
      </div>
      <p className="mt-1.5 text-[12.5px] font-medium">{texto}</p>
      {status === 'abaixo' && (
        <p className="text-[11px] text-white/75">Falta {formatBRL(falta)} de líquido para bater a meta de hoje.</p>
      )}

      {/* "Quanto preciso faturar" — considera gastos que ainda vão sair do bolso hoje */}
      <div className="mt-3 rounded-xl bg-white/10 p-2.5">
        <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden /> Quanto preciso faturar ainda hoje
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <input
            className="h-9 w-28 rounded-lg border-0 bg-white/90 px-2.5 text-sm text-neutral-900 placeholder:text-neutral-500"
            placeholder="Gasto previsto (R$)"
            inputMode="decimal"
            value={gastosPrevistos}
            onChange={(e) => setGastosPrevistos(e.target.value)}
          />
          <p className="text-lg font-bold">{formatBRL(precisoFaturar)}</p>
        </div>
        <p className="mt-1 text-[10px] text-white/70">
          Já considera os gastos de hoje registrados{previstoNum > 0 ? ` + ${formatBRL(previstoNum)} previsto` : ''}.
        </p>
      </div>
    </Secao>
  );
}
