import { supabase } from '@/shared/lib/supabase';

// Lojinha do motorista — consome o backend do Épico 12 (migration 0035) SEM duplicar nada.
// Catálogo vem da RPC catalogo_lojinha() (esconde custo/estoque_minimo/fornecedor); os itens
// dos próprios pedidos vêm de itens_dos_meus_pedidos() (migration 0040, junta o nome do produto
// sem expor dado administrativo). Preço é SEMPRE o congelado pelo backend — nunca recalculado
// no frontend.

export type ProdutoCatalogo = {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  unidade: string;
  preco_venda: number;
  imagem_url: string | null;
  quantidade_disponivel: number;
};

export type PedidoStatus = 'rascunho' | 'solicitado' | 'aprovado' | 'separando' | 'pronto' | 'entregue' | 'cancelado';

export type MeuPedido = {
  id: string;
  status: PedidoStatus;
  observacoes: string | null;
  contrato_id: string | null;
  criado_em: string;
};

export type ItemDoMeuPedido = {
  pedido_id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
};

export async function listCatalogo(): Promise<ProdutoCatalogo[]> {
  const { data, error } = await supabase.rpc('catalogo_lojinha');
  if (error) throw error;
  return (data ?? []) as ProdutoCatalogo[];
}

export async function listMeusPedidos(): Promise<MeuPedido[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, status, observacoes, contrato_id, criado_em')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MeuPedido[];
}

export async function listItensDosMeusPedidos(): Promise<ItemDoMeuPedido[]> {
  const { data, error } = await supabase.rpc('itens_dos_meus_pedidos');
  if (error) throw error;
  return (data ?? []) as ItemDoMeuPedido[];
}

export type ItemCarrinho = { produto: ProdutoCatalogo; quantidade: number };

// Cria um pedido a partir do carrinho, em UMA transação lógica: cria o pedido em 'rascunho'
// (única forma que a RLS de motorista permite inserir — migration 0035), adiciona os itens com
// o preço congelado do catálogo, e move para 'solicitado' (transição que dispara pode('lojinha',
// 'solicitar') no banco). Se algo falhar depois de criar o pedido, ele fica em rascunho — o
// motorista pode retomar/cancelar. O motorista NUNCA aprova o próprio pedido (regra do 0035).
export async function criarPedido(
  itens: ItemCarrinho[],
  contratoId: string | null,
  observacoes: string | null,
): Promise<string> {
  if (itens.length === 0) throw new Error('Carrinho vazio.');

  const { data: pedido, error: erroPedido } = await supabase
    .from('pedidos')
    .insert({ status: 'rascunho', contrato_id: contratoId, observacoes })
    .select('id')
    .single();
  if (erroPedido) throw erroPedido;
  const pedidoId = pedido.id as string;

  const linhas = itens.map((i) => ({
    pedido_id: pedidoId,
    produto_id: i.produto.id,
    quantidade: i.quantidade,
    preco_unitario: i.produto.preco_venda, // preço congelado no momento do pedido
  }));
  const { error: erroItens } = await supabase.from('pedido_itens').insert(linhas);
  if (erroItens) throw erroItens;

  const { error: erroSolicita } = await supabase.from('pedidos').update({ status: 'solicitado' }).eq('id', pedidoId);
  if (erroSolicita) throw erroSolicita;

  return pedidoId;
}

// Cancela um pedido próprio (permitido pela state machine enquanto não-terminal).
export async function cancelarPedido(pedidoId: string): Promise<void> {
  const { error } = await supabase.from('pedidos').update({ status: 'cancelado' }).eq('id', pedidoId);
  if (error) throw error;
}
