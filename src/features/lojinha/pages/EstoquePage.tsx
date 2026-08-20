import { Fragment, useState } from 'react';
import { Boxes, ChevronDown, ChevronRight, ArrowDownToLine } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog } from '@/shared/components/ui/dialog';
import { toast } from '@/shared/components/ui/toast';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { formatDataHora } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { useProdutosComSaldo, useMovimentacoes, useDarEntradaEstoque } from '../hooks/useLojinhaAdmin';
import type { ProdutoComSaldo } from '../api/lojinhaAdmin';

function msgErro(e: unknown) {
  return e instanceof Error ? e.message : undefined;
}

// Status de estoque a partir do saldo e mínimo.
function statusEstoque(saldo: number, minimo: number): { label: string; variant: 'success' | 'warning' | 'destructive' } {
  if (saldo <= 0) return { label: 'Zerado', variant: 'destructive' };
  if (saldo <= minimo) return { label: 'Baixo', variant: 'warning' };
  return { label: 'Em dia', variant: 'success' };
}

// Histórico de movimentações de um produto (carregado sob demanda ao expandir).
function Movimentacoes({ produtoId }: { produtoId: string }) {
  const { data, isLoading, isError } = useMovimentacoes(produtoId);
  if (isLoading) return <div className="px-4 py-3 text-xs text-neutral-500">Carregando movimentações…</div>;
  if (isError) return <div className="px-4 py-3 text-xs text-red-600">Erro ao carregar movimentações.</div>;
  if (!data || data.length === 0)
    return <div className="px-4 py-3 text-xs text-neutral-500">Sem movimentações registradas.</div>;
  return (
    <table className="w-full text-left text-xs">
      <thead className="text-neutral-500">
        <tr>
          <th className="px-4 py-2 font-medium">Tipo</th>
          <th className="px-4 py-2 font-medium">Quantidade</th>
          <th className="px-4 py-2 font-medium">Motivo</th>
          <th className="px-4 py-2 font-medium">Data</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {data.map((m) => {
          const positivo = m.quantidade >= 0;
          return (
            <tr key={m.id}>
              <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300">{m.tipo}</td>
              <td className={cn('px-4 py-2 font-medium', positivo ? 'text-emerald-600' : 'text-red-600')}>
                {positivo ? '+' : ''}
                {m.quantidade}
              </td>
              <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300">{m.motivo ?? '—'}</td>
              <td className="px-4 py-2 text-neutral-500">{formatDataHora(m.criado_em)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function EstoquePage() {
  const { data: produtos, isLoading, isError, refetch } = useProdutosComSaldo();
  const entrada = useDarEntradaEstoque();

  const [expandido, setExpandido] = useState<string | null>(null);

  // Dialog de entrada de estoque.
  const [entradaProduto, setEntradaProduto] = useState<ProdutoComSaldo | null>(null);
  const [qtd, setQtd] = useState('');
  const [motivo, setMotivo] = useState('');

  async function confirmarEntrada() {
    if (!entradaProduto) return;
    const q = Number(qtd);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error('Quantidade inválida.');
      return;
    }
    try {
      await entrada.mutateAsync({ produtoId: entradaProduto.id, quantidade: q, motivo: motivo.trim() || null });
      toast.success('Entrada registrada no estoque.');
      setEntradaProduto(null);
      setQtd('');
      setMotivo('');
    } catch (e) {
      toast.error('Não foi possível dar entrada.', msgErro(e));
    }
  }

  // Ordena: baixo/zerado no topo (saldo <= minimo), depois por nome.
  const ordenados = [...(produtos ?? [])].sort((a, b) => {
    const aBaixo = a.saldo <= a.estoque_minimo ? 0 : 1;
    const bBaixo = b.saldo <= b.estoque_minimo ? 0 : 1;
    if (aBaixo !== bBaixo) return aBaixo - bBaixo;
    return a.nome.localeCompare(b.nome);
  });

  return (
    <div className="p-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Estoque</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Saldo por produto e histórico de movimentações. Produtos com estoque baixo aparecem no topo.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="w-8 px-4 py-3"></th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Mínimo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  Carregando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-600">
                  Erro ao carregar estoque.{' '}
                  <button className="underline" onClick={() => refetch()}>
                    Tentar de novo
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && produtos?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10">
                  <EmptyState
                    icon={Boxes}
                    title="Nenhum produto no estoque"
                    description="Cadastre produtos na aba Produtos para acompanhar o estoque aqui."
                  />
                </td>
              </tr>
            )}
            {ordenados.map((p) => {
              const st = statusEstoque(p.saldo, p.estoque_minimo);
              const aberto = expandido === p.id;
              return (
                <Fragment key={p.id}>
                  <tr className="cursor-pointer" onClick={() => setExpandido(aberto ? null : p.id)}>
                    <td className="px-4 py-3 text-neutral-400">
                      {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{p.nome}</td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                      {p.saldo} {p.unidade}
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{p.estoque_minimo}</td>
                    <td className="px-4 py-3">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEntradaProduto(p);
                          }}
                        >
                          <ArrowDownToLine className="h-4 w-4" /> Dar entrada
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {aberto && (
                    <tr>
                      <td colSpan={6} className="bg-neutral-50 dark:bg-neutral-900/50">
                        <Movimentacoes produtoId={p.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!entradaProduto}
        onOpenChange={(o) => !o && setEntradaProduto(null)}
        title="Dar entrada no estoque"
        description={entradaProduto?.nome}
      >
        <div className="space-y-3">
          <div>
            <Label>Quantidade *</Label>
            <Input type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="Ex.: 20" />
          </div>
          <div>
            <Label>Motivo</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: Compra fornecedor X" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEntradaProduto(null)}>
            Cancelar
          </Button>
          <Button onClick={confirmarEntrada} disabled={entrada.isPending}>
            {entrada.isPending ? 'Registrando…' : 'Registrar entrada'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
