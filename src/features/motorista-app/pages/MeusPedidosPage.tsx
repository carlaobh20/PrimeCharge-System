import { useState } from 'react';
import { formatMoeda, formatDataSimples } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';
import { Secao, Pill, SkeletonPortal, ErroPortal, VazioPortal } from '../components/ui';
import { useMeusPedidos, useItensDosMeusPedidos } from '../hooks/useMotoristaApp';
import { cancelarPedido, type MeuPedido, type PedidoStatus, type ItemDoMeuPedido } from '../api/lojinha';

// Épico 12 — "Meus pedidos". Junta pedidos + seus itens (por pedido_id), mostra status com
// timeline visual e permite cancelar enquanto não-terminal. Total = soma dos subtotais que o
// backend já congelou (nunca recalculado no frontend).

// Rótulo + tom da pill por status.
const STATUS: Record<PedidoStatus, { label: string; tom: 'verde' | 'ambar' | 'azul' | 'neutro' }> = {
  rascunho: { label: 'Rascunho', tom: 'neutro' },
  solicitado: { label: 'Solicitado', tom: 'azul' },
  aprovado: { label: 'Aprovado', tom: 'azul' },
  separando: { label: 'Separando', tom: 'ambar' },
  pronto: { label: 'Pronto', tom: 'verde' },
  entregue: { label: 'Entregue', tom: 'verde' },
  cancelado: { label: 'Cancelado', tom: 'neutro' },
};

// Ordem da timeline (rascunho e cancelado ficam fora do fluxo principal).
const FLUXO: PedidoStatus[] = ['solicitado', 'aprovado', 'separando', 'pronto', 'entregue'];

// Status terminais: não podem mais ser cancelados.
const TERMINAIS: PedidoStatus[] = ['entregue', 'cancelado'];

// Timeline: ✓ concluídos, ● atual, ○ futuros. Cancelado é mostrado separado.
function Timeline({ status }: { status: PedidoStatus }) {
  if (status === 'cancelado') {
    return <p className="text-xs font-medium text-neutral-500">Pedido cancelado.</p>;
  }
  const atual = FLUXO.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {FLUXO.map((etapa, i) => {
        const concluido = atual > i;
        const ehAtual = atual === i;
        return (
          <div key={etapa} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                concluido && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
                ehAtual && 'bg-sky-600 text-white',
                !concluido && !ehAtual && 'bg-neutral-100 text-neutral-400 dark:bg-white/5',
              )}
            >
              {concluido ? '✓' : ehAtual ? '●' : '○'}
            </span>
            <span className="text-[10px] text-neutral-500">{STATUS[etapa].label}</span>
          </div>
        );
      })}
    </div>
  );
}

function CardPedido({ pedido, itens, onCancelar }: { pedido: MeuPedido; itens: ItemDoMeuPedido[]; onCancelar: (id: string) => void }) {
  const [cancelando, setCancelando] = useState(false);
  const total = itens.reduce((s, i) => s + i.subtotal, 0);
  const podeCancelar = !TERMINAIS.includes(pedido.status);

  async function cancelar() {
    if (cancelando) return;
    setCancelando(true);
    try {
      await cancelarPedido(pedido.id);
      toast.success('Pedido cancelado.');
      onCancelar(pedido.id);
    } catch (e) {
      toast.error('Não foi possível cancelar.', e instanceof Error ? e.message : undefined);
    } finally {
      setCancelando(false);
    }
  }

  return (
    <Secao
      titulo={`#${pedido.id.slice(0, 8)}`}
      acao={<Pill tom={STATUS[pedido.status].tom}>{STATUS[pedido.status].label}</Pill>}
    >
      <p className="mb-3 text-xs text-neutral-500">{formatDataSimples(pedido.criado_em)}</p>

      <div className="mb-3">
        <Timeline status={pedido.status} />
      </div>

      <div className="divide-y divide-neutral-100 dark:divide-white/5">
        {itens.map((i) => (
          <div key={i.produto_id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm text-neutral-700 dark:text-neutral-300">
              {i.produto_nome} <span className="text-neutral-400">x{i.quantidade}</span>
            </span>
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{formatMoeda(i.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
        <span className="text-sm text-neutral-500">Total</span>
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{formatMoeda(total)}</span>
      </div>

      {podeCancelar && (
        <Button className="mt-3 w-full" variant="outline" disabled={cancelando} onClick={cancelar}>
          {cancelando ? 'Cancelando…' : 'Cancelar pedido'}
        </Button>
      )}
    </Secao>
  );
}

export function MeusPedidosPage() {
  const pedidos = useMeusPedidos();
  const itens = useItensDosMeusPedidos();

  const cabecalho = <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Meus pedidos</h1>;

  if (pedidos.isLoading || itens.isLoading) {
    return (
      <div className="space-y-4">
        {cabecalho}
        <SkeletonPortal />
      </div>
    );
  }
  if (pedidos.isError || itens.isError) {
    return (
      <div className="space-y-4">
        {cabecalho}
        <ErroPortal onRetry={() => pedidos.refetch()} />
      </div>
    );
  }

  const lista = pedidos.data ?? [];
  if (lista.length === 0) {
    return (
      <div className="space-y-4">
        {cabecalho}
        <VazioPortal>Você ainda não fez pedidos.</VazioPortal>
      </div>
    );
  }

  // Agrupa itens por pedido_id.
  const itensPorPedido = new Map<string, ItemDoMeuPedido[]>();
  for (const i of itens.data ?? []) {
    const arr = itensPorPedido.get(i.pedido_id) ?? [];
    arr.push(i);
    itensPorPedido.set(i.pedido_id, arr);
  }

  const recarregar = () => {
    pedidos.refetch();
    itens.refetch();
  };

  return (
    <div className="space-y-4 pb-6">
      {cabecalho}
      {lista.map((pedido) => (
        <CardPedido
          key={pedido.id}
          pedido={pedido}
          itens={itensPorPedido.get(pedido.id) ?? []}
          onCancelar={recarregar}
        />
      ))}
    </div>
  );
}
