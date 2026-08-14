import { Link } from 'react-router-dom';
import { ShoppingBag, Plus } from 'lucide-react';
import { formatMoeda } from '@/shared/lib/format';
import { Button } from '@/shared/components/ui/button';
import { Secao, Pill, SkeletonPortal, ErroPortal, VazioPortal } from '../components/ui';
import { useCatalogo } from '../hooks/useMotoristaApp';
import { useCarrinho } from '../lib/carrinho';
import type { ProdutoCatalogo } from '../api/lojinha';

// Épico 12 — Lojinha do motorista. Catálogo agrupado por categoria; preço do catálogo é só
// referência (o real é congelado pelo backend no pedido). NUNCA expõe custo/estoque/fornecedor —
// o tipo ProdutoCatalogo não traz esses dados; não inventar.

// Um card de produto: imagem opcional, nome, descrição curta, preço e disponibilidade.
function CardProduto({ produto }: { produto: ProdutoCatalogo }) {
  const { adicionar } = useCarrinho();
  const disponivel = produto.quantidade_disponivel > 0;

  return (
    <div className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
      {/* Imagem (com fallback pra ícone se não houver ou falhar) */}
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 dark:bg-white/5">
        {produto.imagem_url ? (
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <ShoppingBag className="h-6 w-6 text-neutral-400" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{produto.nome}</p>
        {produto.descricao && <p className="line-clamp-2 text-xs text-neutral-500">{produto.descricao}</p>}
        <p className="mt-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {formatMoeda(produto.preco_venda)}
          <span className="text-xs font-normal text-neutral-500">/{produto.unidade}</span>
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          {disponivel ? (
            <Pill tom="verde">Disponível</Pill>
          ) : (
            <Pill tom="neutro">Indisponível</Pill>
          )}
          <Button size="sm" disabled={!disponivel} onClick={() => adicionar(produto)}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LojinhaPage() {
  const { data, isLoading, isError, refetch } = useCatalogo();
  const { quantidadeTotal, valorTotal } = useCarrinho();

  const cabecalho = (
    <div className="flex items-center justify-between">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Lojinha</h1>
      <Link
        to="/motorista/lojinha/carrinho"
        className="relative inline-flex items-center gap-1 text-sm font-medium text-sky-700 dark:text-sky-400"
      >
        <ShoppingBag className="h-5 w-5" />
        {quantidadeTotal > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1 text-xs font-semibold text-white">
            {quantidadeTotal}
          </span>
        )}
      </Link>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {cabecalho}
        <SkeletonPortal />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="space-y-4">
        {cabecalho}
        <ErroPortal onRetry={() => refetch()} />
      </div>
    );
  }

  const produtos = data ?? [];
  if (produtos.length === 0) {
    return (
      <div className="space-y-4">
        {cabecalho}
        <VazioPortal>A lojinha ainda não tem produtos.</VazioPortal>
      </div>
    );
  }

  // Agrupa por categoria (null → "Outros"), preservando ordem de chegada das categorias.
  const grupos = new Map<string, ProdutoCatalogo[]>();
  for (const p of produtos) {
    const cat = p.categoria ?? 'Outros';
    const lista = grupos.get(cat) ?? [];
    lista.push(p);
    grupos.set(cat, lista);
  }

  return (
    <div className="space-y-4 pb-20">
      {cabecalho}

      {Array.from(grupos.entries()).map(([categoria, itens]) => (
        <Secao key={categoria} titulo={categoria}>
          <div className="space-y-3">
            {itens.map((p) => (
              <CardProduto key={p.id} produto={p} />
            ))}
          </div>
        </Secao>
      ))}

      {/* Barra fixa acima da tab bar quando há itens no carrinho */}
      {quantidadeTotal > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-10 mx-auto max-w-md px-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-900/95">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'} · {formatMoeda(valorTotal)}
            </span>
            <Link to="/motorista/lojinha/carrinho">
              <Button size="sm">Ver carrinho</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
