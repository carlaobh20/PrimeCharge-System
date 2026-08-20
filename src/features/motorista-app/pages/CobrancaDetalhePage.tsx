import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { formatMoeda, formatDataSimples } from '@/shared/lib/format';
import { Secao, Linha, Pill, SkeletonPortal, ErroPortal, VazioPortal } from '@/features/motorista-app/components/ui';
import { useMinhasCobrancas, useMeusPagamentos } from '@/features/motorista-app/hooks/useMotoristaApp';
import {
  statusDaCobranca,
  STATUS_COBRANCA_LABEL,
  type StatusCobranca,
} from '@/features/motorista-app/lib/statusCobranca';
import type { FormaPagamento } from '@/features/motorista-app/api/pagamentos';

// Épico 11 — App do Motorista. Detalhe de uma cobrança: termos + pagamento (se houver).
// Sem gateway: o backend não tem pagamento online, então nunca simulamos "Pagar agora".

// Tom da pill por status derivado.
const TOM_STATUS: Record<StatusCobranca, 'verde' | 'azul' | 'vermelho' | 'neutro'> = {
  pago: 'verde',
  em_aberto: 'azul',
  vencido: 'vermelho',
  cancelado: 'neutro',
};

// Rótulo pt-BR da forma de pagamento.
const FORMA_LABEL: Record<FormaPagamento, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
};

export function CobrancaDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cobrancas = useMinhasCobrancas();
  const pagamentos = useMeusPagamentos();

  // Cabeçalho com botão voltar reutilizado nos vários estados.
  const Voltar = (
    <button
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
    >
      <ArrowLeft className="h-4 w-4" /> Voltar
    </button>
  );

  if (cobrancas.isLoading || pagamentos.isLoading) return <SkeletonPortal />;
  if (cobrancas.isError) return <ErroPortal onRetry={() => cobrancas.refetch()} />;

  const cobranca = (cobrancas.data ?? []).find((l) => l.id === id);

  if (!cobranca) {
    return (
      <div className="space-y-4">
        {Voltar}
        <VazioPortal>Cobrança não encontrada.</VazioPortal>
      </div>
    );
  }

  const status = statusDaCobranca(cobranca);
  const pagamento = (pagamentos.data ?? []).find((p) => p.lancamento_id === cobranca.id);

  return (
    <div className="space-y-4">
      {Voltar}

      <Secao titulo="Cobrança" acao={<Pill tom={TOM_STATUS[status]}>{STATUS_COBRANCA_LABEL[status]}</Pill>}>
        <p className="mb-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">{cobranca.descricao}</p>
        <Linha label="Valor" value={formatMoeda(cobranca.valor)} />
        <Linha label="Vencimento" value={formatDataSimples(cobranca.data_prevista)} />
        <Linha label="Categoria" value={cobranca.categoria ?? '—'} />
      </Secao>

      {pagamento && (
        <Secao titulo="Pagamento">
          <Linha label="Data do pagamento" value={pagamento.data_pagamento ? formatDataSimples(pagamento.data_pagamento) : '—'} />
          <Linha label="Valor pago" value={formatMoeda(pagamento.valor)} />
          <Linha
            label="Forma de pagamento"
            value={pagamento.forma_pagamento ? FORMA_LABEL[pagamento.forma_pagamento] : '—'}
          />
        </Secao>
      )}

      {/* Sem pagamento online: orientação discreta, nunca um botão que simula cobrança. */}
      {status !== 'pago' && status !== 'cancelado' && (
        <div className="flex items-start gap-2 rounded-2xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500 dark:border-white/10">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Para pagar, fale com a locadora.</p>
        </div>
      )}

      <Link to="/motorista/pagamentos" className="block text-center text-sm font-medium text-emerald-600 hover:underline">
        Ver todas as cobranças
      </Link>
    </div>
  );
}
