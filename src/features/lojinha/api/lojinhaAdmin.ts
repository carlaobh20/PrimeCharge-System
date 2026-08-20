import { supabase } from '@/shared/lib/supabase';

// Lojinha administrativa (staff). Consome o backend do Épico 12 (migration 0035) — NADA de
// tabela nova. Regra de ouro do estoque: o SALDO é sempre a soma do ledger de
// movimentacoes_estoque, NUNCA um UPDATE em produtos. Entrada = movimentação. Baixa/reversão =
// feitas por trigger na transição do pedido (nunca aqui no cliente).

export type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  sku: string | null;
  unidade: string;
  preco_venda: number;
  custo: number | null;
  estoque_minimo: number;
  imagem_url: string | null;
  ativo: boolean;
  criado_em: string;
};

export type ProdutoComSaldo = Produto & { saldo: number };

export type ProdutoInput = {
  nome: string;
  descricao: string | null;
  categoria: string | null;
  sku: string | null;
  unidade: string;
  preco_venda: number;
  custo: number | null;
  estoque_minimo: number;
  ativo: boolean;
};

// Lista produtos + saldo do ledger (uma query de agregação separada, evita N+1).
export async function listProdutosComSaldo(): Promise<ProdutoComSaldo[]> {
  const [{ data: produtos, error: e1 }, { data: movs, error: e2 }] = await Promise.all([
    supabase.from('produtos').select('*').order('nome'),
    supabase.from('movimentacoes_estoque').select('produto_id, quantidade'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const saldoPorProduto = new Map<string, number>();
  for (const m of movs ?? []) {
    saldoPorProduto.set(m.produto_id, (saldoPorProduto.get(m.produto_id) ?? 0) + Number(m.quantidade));
  }
  return (produtos ?? []).map((p) => ({ ...(p as Produto), saldo: saldoPorProduto.get(p.id) ?? 0 }));
}

export async function criarProduto(input: ProdutoInput): Promise<string> {
  const { data, error } = await supabase.from('produtos').insert(input).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function atualizarProduto(id: string, input: Partial<ProdutoInput>): Promise<void> {
  const { error } = await supabase.from('produtos').update(input).eq('id', id);
  if (error) throw error;
}

// Entrada de estoque = movimentação de entrada no ledger. Quantidade sempre positiva aqui;
// o CHECK do banco garante que 'entrada_compra' seja > 0.
export async function darEntradaEstoque(produtoId: string, quantidade: number, motivo: string | null): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', auth.user?.id ?? '').single();
  const { error } = await supabase.from('movimentacoes_estoque').insert({
    empresa_id: usuario?.empresa_id,
    produto_id: produtoId,
    tipo: 'entrada_compra',
    quantidade: Math.abs(quantidade),
    motivo,
  });
  if (error) throw error;
}

export type MovimentacaoEstoque = {
  id: string;
  produto_id: string;
  tipo: string;
  quantidade: number;
  motivo: string | null;
  criado_em: string;
};

export async function listMovimentacoes(produtoId: string): Promise<MovimentacaoEstoque[]> {
  const { data, error } = await supabase
    .from('movimentacoes_estoque')
    .select('id, produto_id, tipo, quantidade, motivo, criado_em')
    .eq('produto_id', produtoId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MovimentacaoEstoque[];
}

// ---- Pedidos (admin) ----
export type PedidoAdminStatus = 'rascunho' | 'solicitado' | 'aprovado' | 'separando' | 'pronto' | 'entregue' | 'cancelado';

export type PedidoAdmin = {
  id: string;
  motorista_id: string;
  contrato_id: string | null;
  status: PedidoAdminStatus;
  observacoes: string | null;
  criado_em: string;
  motorista: { nome_completo: string } | null;
};

export type PedidoAdminItem = {
  id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  produto: { nome: string } | null;
};

export async function listPedidosAdmin(): Promise<PedidoAdmin[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, motorista_id, contrato_id, status, observacoes, criado_em, motorista:motoristas(nome_completo)')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PedidoAdmin[];
}

export async function listItensDoPedido(pedidoId: string): Promise<PedidoAdminItem[]> {
  const { data, error } = await supabase
    .from('pedido_itens')
    .select('id, produto_id, quantidade, preco_unitario, subtotal, produto:produtos(nome)')
    .eq('pedido_id', pedidoId);
  if (error) throw error;
  return (data ?? []) as unknown as PedidoAdminItem[];
}

// Move o pedido de status. A state machine (fn_validar_transicao_pedido) e os efeitos (baixa de
// estoque na aprovação, lançamento na entrega) vivem NO BANCO — aqui só disparamos a transição.
// Se faltar estoque na aprovação, o trigger anti-negativo falha atomicamente e o erro sobe.
export async function moverPedido(pedidoId: string, novoStatus: PedidoAdminStatus): Promise<void> {
  const { error } = await supabase.from('pedidos').update({ status: novoStatus }).eq('id', pedidoId);
  if (error) throw error;
}
