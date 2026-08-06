import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { toast } from '@/shared/components/ui/toast';
import { usePagamentos, useUpdatePagamentoStatus } from '../hooks/usePagamentos';
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
  const [dialogAberto, setDialogAberto] = useState(false);
  const { data: pagamentos, isLoading, isError } = usePagamentos({ status });
  const updateStatus = useUpdatePagamentoStatus();

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

      <div className="mt-6 flex flex-wrap gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value as PagamentoStatus | 'todos')} className="max-w-xs">
          <option value="todos">Todos os status</option>
          {Object.entries(PAGAMENTO_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
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
            {!isLoading && pagamentos?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  Nenhum pagamento registrado ainda.
                </td>
              </tr>
            )}
            {pagamentos?.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                  {p.lancamento?.descricao ?? '—'}
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatMoeda(p.valor)}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                  {p.forma_pagamento ? FORMA_PAGAMENTO_LABEL[p.forma_pagamento] : '—'}
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{p.conta_bancaria?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatDataSimples(p.data_prevista)}</td>
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
            ))}
          </tbody>
        </table>
      </div>

      <NovoPagamentoDialog open={dialogAberto} onOpenChange={setDialogAberto} />
    </div>
  );
}
