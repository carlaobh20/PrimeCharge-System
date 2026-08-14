import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ProdutoCatalogo, ItemCarrinho } from '../api/lojinha';

// Carrinho da Lojinha — estado só do cliente (em memória, some ao recarregar; não persiste em
// localStorage, que nem é suportado no ambiente). O preço mostrado é o do catálogo; o preço
// REAL do pedido é congelado pelo backend na criação (ver api/lojinha.ts). Nada de cálculo
// financeiro de decisão aqui — só soma de subtotais para exibição.

type CarrinhoCtx = {
  itens: ItemCarrinho[];
  quantidadeTotal: number;
  valorTotal: number;
  adicionar: (produto: ProdutoCatalogo) => void;
  remover: (produtoId: string) => void;
  definirQuantidade: (produtoId: string, quantidade: number) => void;
  limpar: () => void;
};

const Ctx = createContext<CarrinhoCtx | null>(null);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);

  const api = useMemo<CarrinhoCtx>(() => {
    const adicionar = (produto: ProdutoCatalogo) =>
      setItens((prev) => {
        const existente = prev.find((i) => i.produto.id === produto.id);
        if (existente) {
          return prev.map((i) => (i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i));
        }
        return [...prev, { produto, quantidade: 1 }];
      });
    const remover = (produtoId: string) => setItens((prev) => prev.filter((i) => i.produto.id !== produtoId));
    const definirQuantidade = (produtoId: string, quantidade: number) =>
      setItens((prev) =>
        quantidade <= 0
          ? prev.filter((i) => i.produto.id !== produtoId)
          : prev.map((i) => (i.produto.id === produtoId ? { ...i, quantidade } : i)),
      );
    const limpar = () => setItens([]);
    const quantidadeTotal = itens.reduce((s, i) => s + i.quantidade, 0);
    const valorTotal = itens.reduce((s, i) => s + i.quantidade * i.produto.preco_venda, 0);
    return { itens, quantidadeTotal, valorTotal, adicionar, remover, definirQuantidade, limpar };
  }, [itens]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCarrinho(): CarrinhoCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCarrinho fora do CarrinhoProvider');
  return ctx;
}
