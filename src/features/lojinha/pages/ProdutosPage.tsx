import { useState } from 'react';
import { Package, Plus, Pencil, ArrowDownToLine } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog } from '@/shared/components/ui/dialog';
import { toast } from '@/shared/components/ui/toast';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { formatMoeda } from '@/shared/lib/format';
import {
  useProdutosComSaldo,
  useCriarProduto,
  useAtualizarProduto,
  useDarEntradaEstoque,
} from '../hooks/useLojinhaAdmin';
import type { ProdutoComSaldo, ProdutoInput } from '../api/lojinhaAdmin';

// Estado inicial do form de produto (novo).
const FORM_VAZIO: ProdutoInput = {
  nome: '',
  descricao: null,
  categoria: null,
  sku: null,
  unidade: 'un',
  preco_venda: 0,
  custo: null,
  estoque_minimo: 0,
  ativo: true,
};

function msgErro(e: unknown) {
  return e instanceof Error ? e.message : undefined;
}

export function ProdutosPage() {
  const { data: produtos, isLoading, isError, refetch } = useProdutosComSaldo();
  const criar = useCriarProduto();
  const atualizar = useAtualizarProduto();
  const entrada = useDarEntradaEstoque();

  // Dialog de form (criar/editar). editando = null → criando.
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<ProdutoComSaldo | null>(null);
  const [form, setForm] = useState<ProdutoInput>(FORM_VAZIO);

  // Dialog de entrada de estoque.
  const [entradaProduto, setEntradaProduto] = useState<ProdutoComSaldo | null>(null);
  const [qtd, setQtd] = useState('');
  const [motivo, setMotivo] = useState('');

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setFormOpen(true);
  }

  function abrirEdicao(p: ProdutoComSaldo) {
    setEditando(p);
    setForm({
      nome: p.nome,
      descricao: p.descricao,
      categoria: p.categoria,
      sku: p.sku,
      unidade: p.unidade,
      preco_venda: p.preco_venda,
      custo: p.custo,
      estoque_minimo: p.estoque_minimo,
      ativo: p.ativo,
    });
    setFormOpen(true);
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error('Informe o nome do produto.');
      return;
    }
    try {
      if (editando) {
        await atualizar.mutateAsync({ id: editando.id, input: form });
        toast.success('Produto atualizado.');
      } else {
        await criar.mutateAsync(form);
        toast.success('Produto criado.');
      }
      setFormOpen(false);
    } catch (e) {
      toast.error('Não foi possível salvar o produto.', msgErro(e));
    }
  }

  async function toggleAtivo(p: ProdutoComSaldo) {
    try {
      await atualizar.mutateAsync({ id: p.id, input: { ativo: !p.ativo } });
      toast.success(p.ativo ? 'Produto desativado.' : 'Produto ativado.');
    } catch (e) {
      toast.error('Não foi possível alterar o status.', msgErro(e));
    }
  }

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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Produtos</h1>
          <p className="mt-1 text-sm text-neutral-500">Catálogo da lojinha. Preço, custo e nível mínimo de estoque.</p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="h-4 w-4" /> Novo produto
        </Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Saldo</th>
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
                  Erro ao carregar produtos.{' '}
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
                    icon={Package}
                    title="Nenhum produto cadastrado"
                    description="Crie o primeiro produto para começar a montar o catálogo da lojinha."
                    action={
                      <Button onClick={abrirNovo}>
                        <Plus className="h-4 w-4" /> Novo produto
                      </Button>
                    }
                  />
                </td>
              </tr>
            )}
            {produtos?.map((p) => {
              const baixo = p.saldo <= p.estoque_minimo;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{p.nome}</div>
                    {p.sku && <div className="text-xs text-neutral-500">SKU: {p.sku}</div>}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{p.categoria ?? '—'}</td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatMoeda(p.preco_venda)}</td>
                  <td className="px-4 py-3">
                    <span className="mr-2 text-neutral-900 dark:text-neutral-100">
                      {p.saldo} {p.unidade}
                    </span>
                    {baixo && (
                      <Badge variant={p.saldo <= 0 ? 'destructive' : 'warning'}>
                        {p.saldo <= 0 ? 'Zerado' : 'Estoque baixo'}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.ativo ? 'success' : 'secondary'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEntradaProduto(p)}>
                        <ArrowDownToLine className="h-4 w-4" /> Dar entrada
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => abrirEdicao(p)}>
                        <Pencil className="h-4 w-4" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleAtivo(p)}>
                        {p.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Form de criar/editar produto */}
      <Dialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editando ? 'Editar produto' : 'Novo produto'}
        className="max-w-lg"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Input
              value={form.descricao ?? ''}
              onChange={(e) => setForm({ ...form, descricao: e.target.value || null })}
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input
              value={form.categoria ?? ''}
              onChange={(e) => setForm({ ...form, categoria: e.target.value || null })}
            />
          </div>
          <div>
            <Label>SKU</Label>
            <Input value={form.sku ?? ''} onChange={(e) => setForm({ ...form, sku: e.target.value || null })} />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} />
          </div>
          <div>
            <Label>Estoque mínimo</Label>
            <Input
              type="number"
              value={form.estoque_minimo}
              onChange={(e) => setForm({ ...form, estoque_minimo: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Preço de venda</Label>
            <Input
              type="number"
              step="0.01"
              value={form.preco_venda}
              onChange={(e) => setForm({ ...form, preco_venda: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Custo</Label>
            <Input
              type="number"
              step="0.01"
              value={form.custo ?? ''}
              onChange={(e) => setForm({ ...form, custo: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              id="produto-ativo"
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
            />
            <Label htmlFor="produto-ativo" className="mb-0">
              Produto ativo (visível na lojinha)
            </Label>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setFormOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={criar.isPending || atualizar.isPending}>
            {criar.isPending || atualizar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </Dialog>

      {/* Entrada de estoque */}
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
