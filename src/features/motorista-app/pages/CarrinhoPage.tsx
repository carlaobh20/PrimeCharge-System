import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { formatMoeda } from '@/shared/lib/format';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { toast } from '@/shared/components/ui/toast';
import { Secao, VazioPortal } from '../components/ui';
import { useCarrinho } from '../lib/carrinho';
import { useMeuContrato } from '../hooks/useMeuContrato';
import { criarPedido } from '../api/lojinha';

// Épico 12 — Carrinho da Lojinha. Só soma de subtotais para exibição; o preço real é congelado
// pelo backend na criação do pedido (nunca recalculado aqui). Ao solicitar: cria o pedido já em
// 'solicitado', limpa o carrinho e vai para "Meus pedidos".

export function CarrinhoPage() {
  const { itens, valorTotal, definirQuantidade, remover, limpar } = useCarrinho();
  const contrato = useMeuContrato();
  const navigate = useNavigate();
  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Contrato ativo só existe quando o hook não está em loading/erro; senão null.
  const contratoId = !contrato.isLoading && !contrato.isError ? contrato.contratoAtivo?.id ?? null : null;

  async function solicitar() {
    if (itens.length === 0 || enviando) return;
    setEnviando(true);
    try {
      await criarPedido(itens, contratoId, observacoes.trim() || null);
      toast.success('Pedido enviado!');
      limpar();
      navigate('/motorista/lojinha/pedidos');
    } catch (e) {
      toast.error('Não foi possível enviar o pedido.', e instanceof Error ? e.message : undefined);
    } finally {
      setEnviando(false);
    }
  }

  if (itens.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Carrinho</h1>
        <VazioPortal>Seu carrinho está vazio.</VazioPortal>
        <Link to="/motorista/lojinha" className="inline-flex text-sm font-medium text-sky-700 dark:text-sky-400">
          Ir à lojinha
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Carrinho</h1>

      <Secao titulo="Itens">
        <div className="space-y-3">
          {itens.map(({ produto, quantidade }) => (
            <div key={produto.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{produto.nome}</p>
                <p className="text-xs text-neutral-500">
                  {formatMoeda(produto.preco_venda)}/{produto.unidade}
                </p>
              </div>

              {/* Controles de quantidade */}
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" onClick={() => definirQuantidade(produto.id, quantidade - 1)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center text-sm font-medium tabular-nums">{quantidade}</span>
                <Button size="icon" variant="outline" onClick={() => definirQuantidade(produto.id, quantidade + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <span className="w-20 text-right text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {formatMoeda(quantidade * produto.preco_venda)}
              </span>

              <Button size="icon" variant="ghost" onClick={() => remover(produto.id)} aria-label="Remover">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Observações">
        <Label htmlFor="obs" className="sr-only">
          Observações
        </Label>
        <Input
          id="obs"
          placeholder="Ex.: horário de retirada, cor, tamanho…"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </Secao>

      <Secao>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">Total</span>
          <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{formatMoeda(valorTotal)}</span>
        </div>
        <p className="mt-2 text-xs text-neutral-500">O preço é confirmado pela locadora no momento do pedido.</p>
      </Secao>

      <Button className="w-full" size="lg" disabled={enviando || itens.length === 0} onClick={solicitar}>
        {enviando ? 'Enviando…' : 'Solicitar pedido'}
      </Button>
    </div>
  );
}
