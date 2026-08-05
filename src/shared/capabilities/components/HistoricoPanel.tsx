import { History } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { useAuditLog } from '../hooks/useAuditLog';
import type { AuditLogEntry } from '../types';

const ACAO_LABEL: Record<AuditLogEntry['acao'], string> = {
  INSERT: 'Criação',
  UPDATE: 'Alteração',
  DELETE: 'Exclusão',
};

const ACAO_COLOR: Record<AuditLogEntry['acao'], string> = {
  INSERT: 'text-emerald-600 dark:text-emerald-400',
  UPDATE: 'text-blue-600 dark:text-blue-400',
  DELETE: 'text-red-600 dark:text-red-400',
};

function formatValor(v: unknown) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  return String(v);
}

// Campos internos/técnicos que não interessam mostrar no diff de histórico.
const CAMPOS_IGNORADOS = new Set(['id', 'empresa_id', 'atualizado_em', 'criado_em']);

function camposAlterados(entry: AuditLogEntry, fieldLabels?: Record<string, string>) {
  const antigos = entry.dados_antigos ?? {};
  const novos = entry.dados_novos ?? {};
  const chaves = new Set([...Object.keys(antigos), ...Object.keys(novos)]);
  const mudancas: { campo: string; de: unknown; para: unknown }[] = [];

  chaves.forEach((campo) => {
    if (CAMPOS_IGNORADOS.has(campo)) return;
    const de = antigos[campo as keyof typeof antigos];
    const para = novos[campo as keyof typeof novos];
    if (JSON.stringify(de) !== JSON.stringify(para)) {
      mudancas.push({ campo: fieldLabels?.[campo] ?? campo, de, para });
    }
  });

  return mudancas;
}

// Histórico bruto de alterações — lê audit_log (Fase 0, populado desde a Sprint 1 via
// fn_audit_log()) direto, sem precisar de nenhuma tabela/migration nova (Sprint 2, DEC-021).
export function HistoricoPanel({
  tabela,
  registroId,
  fieldLabels,
}: {
  tabela: string;
  registroId: string | undefined;
  fieldLabels?: Record<string, string>;
}) {
  const { data: entradas, isLoading } = useAuditLog(tabela, registroId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100 dark:bg-white/5" />
        ))}
      </div>
    );
  }

  if (!entradas || entradas.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nenhum histórico ainda"
        description="Toda alteração feita neste registro (criação, edição, exclusão) aparece aqui automaticamente, com o antes e depois de cada campo."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {entradas.map((entry) => {
        const mudancas = camposAlterados(entry, fieldLabels);
        return (
          <li
            key={entry.id}
            className="animate-cockpit-fade-in rounded-xl border border-neutral-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.02]"
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${ACAO_COLOR[entry.acao]}`}>{ACAO_LABEL[entry.acao]}</span>
              <span className="text-xs text-neutral-500">
                {new Date(entry.criado_em).toLocaleString('pt-BR')}
              </span>
            </div>
            {mudancas.length > 0 && (
              <dl className="mt-2 space-y-1">
                {mudancas.map((m) => (
                  <div key={m.campo} className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
                    <dt className="text-neutral-500">{m.campo}:</dt>
                    <dd className="text-neutral-400 line-through">{formatValor(m.de)}</dd>
                    <dd className="font-medium text-neutral-800 dark:text-neutral-200">→ {formatValor(m.para)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}
