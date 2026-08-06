import { useState } from 'react';
import { Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { Select } from '@/shared/components/ui/select';
import { toast } from '@/shared/components/ui/toast';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { useDeleteMulta, useMultasPorVeiculo, useUpdateMultaStatus } from '../hooks/useMultas';
import { NovaMultaDialog } from './NovaMultaDialog';
import { MULTA_STATUS_LABEL, type Multa, type MultaStatus } from '../types';

const STATUS_BADGE: Record<MultaStatus, 'warning' | 'success' | 'secondary' | 'destructive'> = {
  pendente: 'warning',
  paga: 'success',
  recorrida: 'secondary',
  cancelada: 'destructive',
};

const STATUS_OPCOES: MultaStatus[] = ['pendente', 'paga', 'recorrida', 'cancelada'];

function MultaRow({
  multa,
  onExcluir,
  onMudarStatus,
}: {
  multa: Multa;
  onExcluir: () => void;
  onMudarStatus: (status: MultaStatus) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 dark:border-white/10">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[multa.status]}>{MULTA_STATUS_LABEL[multa.status]}</Badge>
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{multa.descricao}</p>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {formatDataSimples(multa.data_infracao)} · {multa.orgao_autuador}
          {multa.valor !== null ? ` · ${formatMoeda(multa.valor)}` : ''}
          {multa.pontos !== null ? ` · ${multa.pontos} pts` : ''}
          {multa.data_vencimento ? ` · vence ${formatDataSimples(multa.data_vencimento)}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Select
          value={multa.status}
          onChange={(e) => onMudarStatus(e.target.value as MultaStatus)}
          className="h-8 w-28 text-xs"
        >
          {STATUS_OPCOES.map((s) => (
            <option key={s} value={s}>
              {MULTA_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <button type="button" onClick={onExcluir} aria-label="Excluir multa" className="text-neutral-400 hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function MultasPanel({ veiculoId }: { veiculoId: string }) {
  const { data: multas, isLoading } = useMultasPorVeiculo(veiculoId);
  const updateStatus = useUpdateMultaStatus();
  const deleteMulta = useDeleteMulta();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [excluirId, setExcluirId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {(multas?.length ?? 0) > 0 && <p className="text-xs text-neutral-500">{multas!.length} multa(s) registrada(s)</p>}
        <div className="ml-auto">
          <Button type="button" size="sm" onClick={() => setDialogAberto(true)}>
            <Plus className="h-4 w-4" />
            Registrar multa
          </Button>
        </div>
      </div>

      {isLoading && <div className="h-32 cockpit-shimmer rounded-2xl" />}

      {!isLoading && (multas?.length ?? 0) === 0 && (
        <EmptyState
          icon={ShieldAlert}
          title="Nenhuma multa registrada"
          description="Infrações de trânsito ficam aqui, vinculadas à placa deste veículo."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setDialogAberto(true)}>
              Registrar multa
            </Button>
          }
        />
      )}

      {!isLoading && (multas?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {multas!.map((m) => (
            <MultaRow
              key={m.id}
              multa={m}
              onExcluir={() => setExcluirId(m.id)}
              onMudarStatus={(status) => updateStatus.mutate({ id: m.id, status, veiculoId, motoristaId: m.motorista_id })}
            />
          ))}
        </div>
      )}

      <NovaMultaDialog open={dialogAberto} onOpenChange={setDialogAberto} veiculoId={veiculoId} />

      <ConfirmDialog
        open={!!excluirId}
        onOpenChange={(open) => !open && setExcluirId(null)}
        title="Excluir este registro de multa?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        isPending={deleteMulta.isPending}
        onConfirm={() => {
          if (!excluirId) return;
          const multa = multas?.find((m) => m.id === excluirId);
          deleteMulta.mutate(
            { id: excluirId, veiculoId, motoristaId: multa?.motorista_id },
            { onSuccess: () => { toast.success('Multa excluída'); setExcluirId(null); } }
          );
        }}
      />
    </div>
  );
}
