import { useMemo, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import { diasDesde, formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { toast } from '@/shared/components/ui/toast';
import { usePagamentos, usePagamentosPendentesPorEmpresa, useUpdatePagamentoStatus } from '../hooks/usePagamentos';
import { NovoPagamentoDialog } from '../components/NovoPagamentoDialog';
import {
  FORMA_PAGAMENTO_LABEL,
  PAGAMENTO_STATUS_LABEL,
  PAGAMENTO_STATUS_TRANSITIONS,
  type PagamentoStatus,
} from '../types';

const STATUS_BADGE: Record<PagamentoStatus, 'warning' | 'success' | 'secondary' | 'destructive'> = {
  pendente: 'warning',
  pago: 'success',
  cancelado: 'secondary',
  estornado: 'destructive',
};

// Sem página de detalhe, mesmo racional de DEC-052 (Lançamentos) — lista + Dialog de criação
// é a interação completa. Primeiro lugar da aplicação onde "receber pagamento" vira possível
// pela interface (ver relatório da Missão 2, achado crítico #1).
export function PagamentosPage() {
  const [status, setStatus] = useState<PagamentoStatus | 'todos'>('todos');
  const [apenasAtrasados, setApenasAtrasados] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const { data: pagamentos, isLoading, isError } = usePagamentos({ status: apenasAtrasados ? 'pendente' : status });
  const updateStatus = useUpdatePagamentoStatus();

  // Achado da auditoria do Épico 1 (Operação Perfeita, achado #2): não existia fila de
  // cobrança — nada dizia quanto estava atrasado nem permitia filtrar só isso. "Atrasado" não
  // é um status persistido (ver PagamentoStatus em types.ts): é sempre pendente + data_prevista
  // no passado, calculado aqui com o mesmo diasDesde() já usado em Frota/Motoristas/Contratos.
  // O resumo usa usePagamentosPendentesPorEmpresa (empresa inteira, sem filtro de tela) para
  // não sumir quando o operador troca o Select de status — a tabela usa o filtro local.
  const { data: pendentesEmpresa } = usePagamentosPendentesPorEmpresa();
  const atrasados = useMemo(
    () => (pendentesEmpresa ?? []).filter((p) => diasDesde(p.data_prevista) !== null),
    [pendentesEmpresa]
  );
  const totalAtrasado = useMemo(() => atrasados.reduce((soma, p) => soma + Number(p.valor ?? 0), 0), [atrasados]);

  const pagamentosExibidos = useMemo(() => {
    if (!pagamentos) return pagamentos;
    if (!apenasAtrasados) return pagamentos;
    return pagamentos.filter((p) => diasDesde(p.data_prevista) !== null);
  }, [pagamentos, apenasAtrasados]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Pagamentos</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Movimentação real de dinheiro — cada pagamento nasce vinculado a um Lançamento e, ao ser marcado como "Pago", confirma o lançamento automaticamente.
          </p>
        </div>
        <Button onClick={() => setDialogAberto(true)}>
          <Plus className="h-4 w-4" />
          Novo pagamento
        </Button>
      </div>

      {atrasados.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setStatus('pendente');
            setApenasAtrasados(true);
          }}
          className={cn(
            'mt-6 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
            apenasAtrasados
              ? 'border-red-300 bg-red-100 dark:border-red-900 dark:bg-red-950/60'
              : 'border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:hover:bg-red-950/50'
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-300">
            <strong className="font-semibold">
              {atrasados.length} pagamento{atrasados.length === 1 ? '' : 's'} atrasado{atrasados.length === 1 ? '' : 's'}
            </strong>{' '}
            — {formatMoeda(totalAtrasado)} no total.{' '}
            {apenasAtrasados ? 'Mostrando só atrasados abaixo.' : 'Clique para ver a fila de cobrança.'}
          </span>
        </button>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select
          value={apenasAtrasados ? 'pendente' : status}
          onChange={(e) => {
            setApenasAtrasados(false);
            setStatus(e.target.value as PagamentoStatus | 'todos');
          }}
          className="max-w-xs"
        >
          <option value="todos">Todos os status</option>
          {Object.entries(PAGAMENTO_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        {apenasAtrasados && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setApenasAtrasados(false)}>
            Limpar filtro de atrasados
          </Button>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3">Lançamento</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Forma</th>
              <th className="px-4 py-3">Conta</th>
              <th className="px-4 py-3">Data prevista</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  Carregando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-600">
                  Erro ao carregar pagamentos.
                </td>
              </tr>
            )}
            {!isLoading && pagamentosExibidos?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  {apenasAtrasados ? 'Nenhum pagamento atrasado — fila zerada.' : 'Nenhum pagamento registrado ainda.'}
                </td>
              </tr>
            )}
            {pagamentosExibidos?.map((p) => {
              const diasAtraso = p.status === 'pendente' ? diasDesde(p.data_prevista) : null;
              const emAtraso = diasAtraso !== null;
              return (
                <tr
                  key={p.id}
                  className={cn(
                    'hover:bg-neutral-50 dark:hover:bg-neutral-900/50',
                    emAtraso && 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50'
                  )}
                >
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {p.lancamento?.descricao ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatMoeda(p.valor)}</td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                    {p.forma_pagamento ? FORMA_PAGAMENTO_LABEL[p.forma_pagamento] : '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{p.conta_bancaria?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                    {formatDataSimples(p.data_prevista)}
                    {emAtraso && (
                      <Badge variant="destructive" className="ml-2">
                        {diasAtraso} {diasAtraso === 1 ? 'dia' : 'dias'} atrasado
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {PAGAMENTO_STATUS_TRANSITIONS[p.status].length > 0 ? (
                      <Select
                        value={p.status}
                        onChange={(e) => {
                          const novoStatus = e.target.value as PagamentoStatus;
                          updateStatus.mutate(
                            { id: p.id, status: novoStatus },
                            { onSuccess: () => toast.success(`Pagamento marcado como "${PAGAMENTO_STATUS_LABEL[novoStatus]}"`) }
                          );
                        }}
                        className="h-8 text-xs"
                      >
                        <option value={p.status}>{PAGAMENTO_STATUS_LABEL[p.status]}</option>
                        {PAGAMENTO_STATUS_TRANSITIONS[p.status].map((proximo) => (
                          <option key={proximo} value={proximo}>
                            {PAGAMENTO_STATUS_LABEL[proximo]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Badge variant={STATUS_BADGE[p.status]}>{PAGAMENTO_STATUS_LABEL[p.status]}</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <NovoPagamentoDialog open={dialogAberto} onOpenChange={setDialogAberto} />
    </div>
  );
}
