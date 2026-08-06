import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { toast } from '@/shared/components/ui/toast';
import { formatMoeda, formatDataSimples, diasAte } from '@/shared/lib/format';
import { Target } from 'lucide-react';
import { useAtualizarProgressoMeta, useMetasPorEmpresa, useUpdateMetaStatus, useDeleteMeta } from '../hooks/useMetas';
import { NovaMetaDialog } from './NovaMetaDialog';
import { META_STATUS_LABEL, type Meta } from '../types';

function formatValor(valor: number, unidade: Meta['unidade']) {
  if (unidade === 'moeda') return formatMoeda(valor);
  if (unidade === 'percentual') return `${valor}%`;
  return valor.toLocaleString('pt-BR');
}

function MetaCard({ meta }: { meta: Meta }) {
  const atualizarProgresso = useAtualizarProgressoMeta();
  const updateStatus = useUpdateMetaStatus();
  const deleteMeta = useDeleteMeta();
  const [editando, setEditando] = useState(false);
  const [novoValor, setNovoValor] = useState(String(meta.valor_atual));

  const progresso = Math.min(100, Math.round((meta.valor_atual / meta.valor_alvo) * 100));
  const diasRestantes = diasAte(meta.data_alvo);
  const atrasada = meta.status === 'em_andamento' && diasRestantes !== null && diasRestantes < 0 && progresso < 100;

  function salvarProgresso() {
    const valor = Number(novoValor);
    if (!Number.isFinite(valor) || valor < 0) return;
    atualizarProgresso.mutate(
      { id: meta.id, valorAtual: valor },
      {
        onSuccess: () => {
          toast.success('Progresso atualizado');
          setEditando(false);
          if (valor >= meta.valor_alvo) {
            updateStatus.mutate({ id: meta.id, status: 'concluida' }, { onSuccess: () => toast.success('Meta concluída!') });
          }
        },
      }
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-white/10">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">{meta.titulo}</p>
          {meta.descricao && <p className="mt-0.5 text-xs text-neutral-500">{meta.descricao}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {meta.status === 'concluida' && <Badge variant="success">{META_STATUS_LABEL.concluida}</Badge>}
          {meta.status === 'cancelada' && <Badge variant="secondary">{META_STATUS_LABEL.cancelada}</Badge>}
          {atrasada && <Badge variant="destructive">Atrasada</Badge>}
          <button
            type="button"
            onClick={() => deleteMeta.mutate(meta.id, { onSuccess: () => toast.success('Meta excluída') })}
            aria-label="Excluir meta"
            className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
        <div
          className={progresso >= 100 ? 'h-full bg-emerald-500' : atrasada ? 'h-full bg-red-500' : 'h-full bg-blue-500'}
          style={{ width: `${progresso}%` }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-xs text-neutral-500">
        <span>
          {formatValor(meta.valor_atual, meta.unidade)} de {formatValor(meta.valor_alvo, meta.unidade)} ({progresso}%)
        </span>
        {meta.data_alvo && <span>até {formatDataSimples(meta.data_alvo)}</span>}
      </div>

      {meta.status === 'em_andamento' && (
        <div className="mt-2">
          {editando ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value)}
                className="h-7 max-w-[120px] text-xs"
              />
              <Button type="button" size="sm" className="h-7" onClick={salvarProgresso} disabled={atualizarProgresso.isPending}>
                Salvar
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditando(true)}>
              Atualizar progresso
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function MetasPanel() {
  const { data: metas, isLoading } = useMetasPorEmpresa();
  const [novaMetaAberta, setNovaMetaAberta] = useState(false);

  const metasAtivas = (metas ?? []).filter((m) => m.status !== 'cancelada');

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-1.5">
          <Target className="h-4 w-4 text-neutral-400" />
          Metas
        </CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={() => setNovaMetaAberta(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nova meta
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
        {!isLoading && metasAtivas.length === 0 && (
          <EmptyState icon={Target} title="Nenhuma meta ainda" description="Defina um alvo concreto — frota, receita, motoristas ativos — e acompanhe o progresso aqui." />
        )}
        {metasAtivas.map((meta) => (
          <MetaCard key={meta.id} meta={meta} />
        ))}
      </CardContent>
      <NovaMetaDialog open={novaMetaAberta} onOpenChange={setNovaMetaAberta} />
    </Card>
  );
}
