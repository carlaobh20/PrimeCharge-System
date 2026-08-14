import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listProdutosComSaldo, criarProduto, atualizarProduto, darEntradaEstoque, listMovimentacoes,
  listPedidosAdmin, listItensDoPedido, moverPedido,
  type ProdutoInput, type PedidoAdminStatus,
} from '../api/lojinhaAdmin';

const K = (...p: string[]) => ['lojinha-admin', ...p];

export function useProdutosComSaldo() {
  return useQuery({ queryKey: K('produtos'), queryFn: listProdutosComSaldo });
}
export function useMovimentacoes(produtoId: string) {
  return useQuery({ queryKey: K('movimentacoes', produtoId), queryFn: () => listMovimentacoes(produtoId), enabled: !!produtoId });
}
export function usePedidosAdmin() {
  return useQuery({ queryKey: K('pedidos'), queryFn: listPedidosAdmin });
}
export function useItensDoPedido(pedidoId: string) {
  return useQuery({ queryKey: K('pedido-itens', pedidoId), queryFn: () => listItensDoPedido(pedidoId), enabled: !!pedidoId });
}

export function useCriarProduto() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: ProdutoInput) => criarProduto(i), onSuccess: () => qc.invalidateQueries({ queryKey: K('produtos') }) });
}
export function useAtualizarProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: Partial<ProdutoInput> }) => atualizarProduto(args.id, args.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: K('produtos') }),
  });
}
export function useDarEntradaEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { produtoId: string; quantidade: number; motivo: string | null }) =>
      darEntradaEstoque(args.produtoId, args.quantidade, args.motivo),
    onSuccess: (_d, args) => {
      qc.invalidateQueries({ queryKey: K('produtos') });
      qc.invalidateQueries({ queryKey: K('movimentacoes', args.produtoId) });
    },
  });
}
export function useMoverPedido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { pedidoId: string; status: PedidoAdminStatus }) => moverPedido(args.pedidoId, args.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K('pedidos') });
      qc.invalidateQueries({ queryKey: K('produtos') });
    },
  });
}
