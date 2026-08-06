import { useState } from 'react';
import { CalendarCheck, Plus, Trash2, Wrench } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { toast } from '@/shared/components/ui/toast';
import { diasAte, formatDataSimples, formatKm, formatMoeda } from '@/shared/lib/format';
import { useDeleteManutencao, useManutencoesPorVeiculo, useMarcarManutencaoRealizada } from '../hooks/useManutencoes';
import { NovaManutencaoDialog } from './NovaManutencaoDialog';
import { MarcarManutencaoRealizadaDialog } from './dialogs/MarcarManutencaoRealizadaDialog';
import { MANUTENCAO_TIPO_LABEL, MANUTENCAO_STATUS_EXECUCAO_LABEL, type Manutencao, type ManutencaoTipo } from '../types';

const TIPO_BADGE: Record<ManutencaoTipo, 'warning' | 'destructive' | 'secondary'> = {
  preventiva: 'secondary',
  corretiva: 'destructive',
  outro: 'warning',
};

function ManutencaoRow({
  manutencao,
  onExcluir,
  onMarcarRealizada,
}: {
  manutencao: Manutencao;
  onExcluir: () => void;
  onMarcarRealizada: () => void;
}) {
  const agendada = manutencao.status_execucao === 'agendada';
  const diasAgendada = agendada ? diasAte(manutencao.data_agendada) : null;
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 dark:border-white/10">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={TIPO_BADGE[manutencao.tipo]}>{MANUTENCAO_TIPO_LABEL[manutencao.tipo]}</Badge>
          {agendada && (
            <Badge variant={diasAgendada !== null && diasAgendada < 0 ? 'destructive' : 'info'}>
              {MANUTENCAO_STATUS_EXECUCAO_LABEL.agendada}
            </Badge>
          )}
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{manutencao.descricao}</p>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {agendada
            ? `Agendada para ${formatDataSimples(manutencao.data_agendada)}`
            : formatDataSimples(manutencao.data_execucao)}
          {manutencao.oficina ? ` · ${manutencao.oficina}` : ''}
          {manutencao.km !== null ? ` · ${formatKm(manutencao.km)}` : ''}
          {manutencao.custo !== null ? ` · ${formatMoeda(manutencao.custo)}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {agendada && (
          <button
            type="button"
            onClick={onMarcarRealizada}
            aria-label="Marcar como realizada"
            className="text-neutral-400 hover:text-emerald-600"
            title="Marcar como realizada"
          >
            <CalendarCheck className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onExcluir}
          aria-label="Excluir manutenção"
          className="text-neutral-400 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ManutencoesPanel({ veiculoId }: { veiculoId: string }) {
  const { data: manutencoes, isLoading } = useManutencoesPorVeiculo(veiculoId);
  const deleteManutencao = useDeleteManutencao();
  const marcarRealizada = useMarcarManutencaoRealizada();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const [realizarId, setRealizarId] = useState<string | null>(null);

  const custoTotal = (manutencoes ?? []).reduce((soma, m) => soma + (m.custo ?? 0), 0);
  const manutencaoParaRealizar = manutencoes?.find((m) => m.id === realizarId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {(manutencoes?.length ?? 0) > 0 && (
          <p className="text-xs text-neutral-500">
            {manutencoes!.length} registro(s) · custo total {formatMoeda(custoTotal)}
          </p>
        )}
        <div className="ml-auto">
          <Button type="button" size="sm" onClick={() => setDialogAberto(true)}>
            <Plus className="h-4 w-4" />
            Nova manutenção
          </Button>
        </div>
      </div>

      {isLoading && <div className="h-32 cockpit-shimmer rounded-2xl" />}

      {!isLoading && (manutencoes?.length ?? 0) === 0 && (
        <EmptyState
          icon={Wrench}
          title="Nenhuma manutenção registrada"
          description="Revisões, trocas de peça e reparos ficam aqui — histórico estruturado, não um lançamento financeiro genérico."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setDialogAberto(true)}>
              Registrar manutenção
            </Button>
          }
        />
      )}

      {!isLoading && (manutencoes?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {manutencoes!.map((m) => (
            <ManutencaoRow
              key={m.id}
              manutencao={m}
              onExcluir={() => setExcluirId(m.id)}
              onMarcarRealizada={() => setRealizarId(m.id)}
            />
          ))}
        </div>
      )}

      <NovaManutencaoDialog open={dialogAberto} onOpenChange={setDialogAberto} veiculoId={veiculoId} />

      <MarcarManutencaoRealizadaDialog
        open={!!realizarId}
        onOpenChange={(open) => !open && setRealizarId(null)}
        manutencao={manutencaoParaRealizar}
        isPending={marcarRealizada.isPending}
        onConfirm={(dataExecucao, custo) => {
          if (!realizarId) return;
          marcarRealizada.mutate(
            { id: realizarId, veiculoId, dataExecucao, custo },
            { onSuccess: () => { toast.success('Manutenção marcada como realizada'); setRealizarId(null); } }
          );
        }}
      />

      <ConfirmDialog
        open={!!excluirId}
        onOpenChange={(open) => !open && setExcluirId(null)}
        title="Excluir este registro de manutenção?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        isPending={deleteManutencao.isPending}
        onConfirm={() => {
          if (!excluirId) return;
          deleteManutencao.mutate(
            { id: excluirId, veiculoId },
            { onSuccess: () => { toast.success('Manutenção excluída'); setExcluirId(null); } }
          );
        }}
      />
    </div>
  );
}
