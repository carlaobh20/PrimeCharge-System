import { Check, Circle, Minus } from 'lucide-react';
import { Secao } from '../ui';
import type { ChecklistHoje, SaudeHoje } from '../../lib/metas';

// CHECKLIST DO DIA (Fase 13, Módulo 3) — "REGISTROS DO DIA" (não "você precisa preencher").
// Cada item mostra: REGISTRADO / NÃO INFORMADO / INCOMPLETO / NÃO APLICÁVEL. Nunca obrigação.

const STATUS_ICON = {
  registrado: Check,
  nao_informado: Circle,
  incompleto: Minus,
  nao_aplicavel: Minus,
} as const;

const STATUS_TEXT: Record<string, string> = {
  registrado: 'REGISTRADO',
  nao_informado: 'NÃO INFORMADO',
  incompleto: 'INCOMPLETO',
  nao_aplicavel: 'NÃO APLICÁVEL',
};

const STATUS_COLOR = {
  registrado: 'text-emerald-600 dark:text-emerald-400',
  nao_informado: 'text-neutral-400',
  incompleto: 'text-amber-600 dark:text-amber-400',
  nao_aplicavel: 'text-neutral-300 dark:text-white/20',
} as const;

const ITENS: { key: keyof ChecklistHoje; label: string }[] = [
  { key: 'ganho', label: 'Ganho' },
  { key: 'horas', label: 'Horas' },
  { key: 'km', label: 'KM rodado' },
  { key: 'corridas', label: 'Corridas' },
  { key: 'apps', label: 'Apps informados' },
  { key: 'recargas', label: 'Recargas' },
  { key: 'encerrado', label: 'Dia encerrado' },
];

export function ChecklistHojeCard({ checklist, saude }: { checklist: ChecklistHoje; saude: SaudeHoje }) {
  return (
    <Secao titulo="Registros do dia">
      <div className="space-y-1.5">
        {ITENS.map(({ key, label }) => {
          const status = checklist[key];
          const Icon = STATUS_ICON[status];
          return (
            <div key={key} className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 text-[12px] dark:border-white/10">
              <span className="text-neutral-700 dark:text-neutral-200">{label}</span>
              <span className={`flex items-center gap-1 font-medium ${STATUS_COLOR[status]}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {STATUS_TEXT[status]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Saúde do registro (Módulo 5) — COMPLETO / INCOMPLETO / SEM DADOS */}
      <div className={`mt-2 rounded-xl px-3 py-2 text-[12px] ${saude.status === 'completo' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : saude.status === 'incompleto' ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-neutral-50 text-neutral-600 dark:bg-white/5 dark:text-neutral-300'}`}>
        <p className="font-semibold uppercase tracking-wide text-[10px] opacity-80">Qualidade dos dados de hoje</p>
        <p className="mt-0.5">{saude.texto}</p>
      </div>
    </Secao>
  );
}