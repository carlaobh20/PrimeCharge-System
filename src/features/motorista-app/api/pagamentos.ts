import { supabase } from '@/shared/lib/supabase';

// Cobranças e pagamentos do motorista. RLS (migration 0040) garante que só as próprias receitas
// e os próprios pagamentos voltam — nenhum filtro client-side (mesmo padrão do resto do portal).
// Colunas EXPLÍCITAS (nunca select('*') — regra do portal, fix R4 da Fase 1): nada de campos
// internos (centro_custo, criado_via, observacoes internas etc.).

export type LancamentoStatusDB = 'prevista' | 'confirmada' | 'cancelada';

export type MeuLancamento = {
  id: string;
  descricao: string;
  valor: number;
  categoria: string | null;
  status: LancamentoStatusDB;
  data_prevista: string; // = vencimento (DATE)
  data_confirmacao: string | null;
  contrato_id: string | null;
  pedido_id: string | null;
};

export type FormaPagamento = 'pix' | 'boleto' | 'cartao' | 'dinheiro' | 'transferencia';

export type MeuPagamento = {
  id: string;
  lancamento_id: string;
  status: 'pendente' | 'pago' | 'cancelado' | 'estornado';
  valor: number;
  forma_pagamento: FormaPagamento | null;
  data_prevista: string;
  data_pagamento: string | null;
};

const COLUNAS_LANCAMENTO =
  'id, descricao, valor, categoria, status, data_prevista, data_confirmacao, contrato_id, pedido_id';
const COLUNAS_PAGAMENTO = 'id, lancamento_id, status, valor, forma_pagamento, data_prevista, data_pagamento';

// Todas as cobranças (lançamentos de receita) do motorista, mais recentes primeiro por
// vencimento.
export async function listMinhasCobrancas(): Promise<MeuLancamento[]> {
  const { data, error } = await supabase
    .from('lancamentos')
    .select(COLUNAS_LANCAMENTO)
    .order('data_prevista', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MeuLancamento[];
}

// Pagamentos registrados (o que já foi liquidado), indexáveis por lancamento_id.
export async function listMeusPagamentos(): Promise<MeuPagamento[]> {
  const { data, error } = await supabase
    .from('pagamentos')
    .select(COLUNAS_PAGAMENTO)
    .order('data_prevista', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MeuPagamento[];
}
