import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge, type BadgeProps } from '@/shared/components/ui/badge';
import { Dialog } from '@/shared/components/ui/dialog';
import { toast } from '@/shared/components/ui/toast';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { formatMoeda, formatDataHora } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { usePedidosAdmin, useItensDoPedido, useMoverPedido } from '../hooks/useLojinhaAdmin';
import type { PedidoAdmin, PedidoAdminStatus } from '../api/lojinhaAdmin';

// Transições válidas (state machine espelhada do banco; o banco é a fonte da verdade).
const TRANSICOES: Record<PedidoAdminStatus, PedidoAdminStatus[]> = {
  rascunho: [],
  solicitado: ['aprovado', 'cancelado'],
  aprovado: ['separando', 'cancelado'],
  separando: ['pronto', 'cancelado'],
  pronto: ['entregue', 'cancelado'],
  entregue: [],
  cancelado: [],
};

const STATUS_LABEL: Record<PedidoAdminStatus, string> = {
  rascunho: 'Rascunho',
  solicitado: 'Solicitado',
  aprovado: 'Aprovado',
  separando: 'Separando',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const STATUS_VARIANT: Record<PedidoAdminStatus, BadgeProps['variant']> = {
  rascunho: 'secondary',
  solicitado: 'info',
  aprovado: 'info',
  separando: 'warning',
  pronto: 'warning',
  entregue: 'success',
  cancelado: 'destructive',
};

// Chips de filtro (ordem operacional).
const FILTROS: { key: PedidoAdminStatus | 'todos'; label: string }[] = [
  { key: 'solicitado', label: 'Solicitados' },
  { key: 'aprovado', label: 'Aprovados' },
  { key: 'separando', label: 'Separando' },
  { key: 'pronto', label: 'Prontos' },
  { key: 'entregue', label: 'Entregues' },
  { key: 'cancelado', label: 'Cancelados' },
  { key: 'todos', label: 'Todos' },
];

function msgErro(e: unknown) {
  return e instanceof Error ? e.message : undefined;
}

// Detalhe do pedido: itens, total e ações de transição.
function DetalhePedido({ pedido, onClose }: { pedido: PedidoAdmin; onClose: () => void }) {
  const { data: itens, isLoading, isError } = useItensDoPedido(pedido.id);
  const mover = useMoverPedido();

  const total = (itens ?? []).reduce((acc, it) => acc + Number(it.subtotal), 0);
  const acoes = TRANSICOES[pedido.status];

  async function transicionar(status: PedidoAdminStatus) {
    try {
      await mover.mutateAsync({ pedidoId: pedido.id, status });
      toast.success(`Pedido movido para "${STATUS_LABEL[status]}".`);
      onClose();
    } catch (e) {
      // Erro do banco (ex.: estoque insuficiente na aprovação) sobe aqui.
      toast.error('Não foi possível mover o pedido.', msgErro(e));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-neutral-500">
          {pedido.motorista?.nome_completo ?? 'Motorista'} · {formatDataHora(pedido.criado_em)}
        </div>
        <Badge variant={STATUS_VARIANT[pedido.status]}>{STATUS_LABEL[pedido.status]}</Badge>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-3 py-2">Produto</th>
              <th className="px-3 py-2 text-right">Qtd</th>
              <th className="px-3 py-2 text-right">Preço unit.</th>
              <th className="px-3 py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-neutral-500">
                  Carregando itens…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-red-600">
                  Erro ao carregar itens.
                </td>
              </tr>
            )}
            {itens?.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">{it.produto?.nome ?? '—'}</td>
                <td className="px-3 py-2 text-right text-neutral-700 dark:text-neutral-300">{it.quantidade}</td>
                <td className="px-3 py-2 text-right text-neutral-700 dark:text-neutral-300">
                  {formatMoeda(it.preco_unitario)}
                </td>
                <td className="px-3 py-2 text-right text-neutral-900 dark:text-neutral-100">
                  {formatMoeda(it.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 dark:border-neutral-800">
              <td colSpan={3} className="px-3 py-2 text-right text-xs font-medium uppercase text-neutral-500">
                Total
              </td>
              <td className="px-3 py-2 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                {formatMoeda(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {pedido.observacoes && (
        <div className="mt-4">
          <div className="text-xs font-medium uppercase text-neutral-500">Observações</div>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{pedido.observacoes}</p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
        {acoes.map((status) => (
          <Button
            key={status}
            variant={status === 'cancelado' ? 'destructive' : 'default'}
            onClick={() => transicionar(status)}
            disabled={mover.isPending}
          >
            {status === 'cancelado' ? 'Cancelar pedido' : STATUS_LABEL[status]}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function PedidosAdminPage() {
  const { data: pedidos, isLoading, isError, refetch } = usePedidosAdmin();
  const [filtro, setFiltro] = useState<PedidoAdminStatus | 'todos'>('solicitado');
  const [selecionado, setSelecionado] = useState<PedidoAdmin | null>(null);

  const lista = (pedidos ?? []).filter((p) => filtro === 'todos' || p.status === filtro);

  return (
    <div className="p-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Pedidos</h1>
        <p className="mt-1 text-sm text-neutral-500">Fila operacional da lojinha. Aprove, separe e entregue.</p>
      </div>

      {/* Chips de filtro por status */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = filtro === f.key;
          const count = f.key === 'todos' ? pedidos?.length ?? 0 : (pedidos ?? []).filter((p) => p.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                ativo
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800'
              )}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3">Motorista</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  Carregando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-red-600">
                  Erro ao carregar pedidos.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Tentar de novo
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && lista.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10">
                  <EmptyState
                    icon={ClipboardList}
                    title="Nenhum pedido nesta fila"
                    description="Quando houver pedidos com este status, eles aparecem aqui."
                  />
                </td>
              </tr>
            )}
            {lista.map((p) => (
              <tr key={p.id} className="cursor-pointer" onClick={() => setSelecionado(p)}>
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                  {p.motorista?.nome_completo ?? '—'}
                </td>
                <td className="px-4 py-3 text-neutral-500">{formatDataHora(p.criado_em)}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelecionado(p); }}>
                    Ver detalhe
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!selecionado}
        onOpenChange={(o) => !o && setSelecionado(null)}
        title="Detalhe do pedido"
        className="max-w-2xl"
      >
        {selecionado && <DetalhePedido pedido={selecionado} onClose={() => setSelecionado(null)} />}
      </Dialog>
    </div>
  );
}
