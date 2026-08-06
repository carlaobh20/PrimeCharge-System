import { useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardCheck, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Select } from '@/shared/components/ui/select';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { toast } from '@/shared/components/ui/toast';
import { formatDataRelativa } from '@/shared/lib/format';
import { useChecklistsPorEntidade, useResponderChecklistItem, useUpdateChecklistStatus } from '../hooks/useChecklists';
import { NovoChecklistDialog } from './NovoChecklistDialog';
import { CHECKLIST_STATUS_LABEL, CHECKLIST_STATUS_TRANSITIONS, type ChecklistComItens, type ChecklistStatus } from '../types';

const STATUS_BADGE: Record<ChecklistStatus, 'warning' | 'success' | 'secondary'> = {
  aberto: 'warning',
  concluido: 'success',
  cancelado: 'secondary',
};

function ChecklistCard({ checklist }: { checklist: ChecklistComItens }) {
  const [expandido, setExpandido] = useState(checklist.status === 'aberto');
  const responder = useResponderChecklistItem();
  const updateStatus = useUpdateChecklistStatus();

  const totalItens = checklist.itens.length;
  const respondidos = checklist.itens.filter((i) => i.resposta !== null).length;
  const progresso = totalItens === 0 ? 0 : Math.round((respondidos / totalItens) * 100);
  const transicoes = CHECKLIST_STATUS_TRANSITIONS[checklist.status];

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-white/10">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{checklist.titulo}</p>
            <Badge variant={STATUS_BADGE[checklist.status]}>{CHECKLIST_STATUS_LABEL[checklist.status]}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {respondidos}/{totalItens} itens respondidos ({progresso}%) · criado {formatDataRelativa(checklist.criado_em)}
          </p>
        </div>
        {expandido ? <ChevronUp className="h-4 w-4 shrink-0 text-neutral-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />}
      </button>

      {expandido && (
        <div className="border-t border-neutral-100 px-4 py-3 dark:border-white/5">
          <div className="space-y-1.5">
            {checklist.itens.map((item) => {
              const reprovado = item.resposta === false;
              return (
                <div key={item.id} className="rounded-lg px-1 py-1.5 hover:bg-neutral-50 dark:hover:bg-white/5">
                  <label className="flex items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={item.resposta ?? false}
                      disabled={checklist.status !== 'aberto' || responder.isPending}
                      onChange={(e) =>
                        responder.mutate({ itemId: item.id, payload: { resposta: e.target.checked, observacao: item.observacao } })
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span
                      className={
                        item.resposta
                          ? 'text-neutral-500 line-through decoration-neutral-300'
                          : 'text-neutral-700 dark:text-neutral-300'
                      }
                    >
                      {item.descricao}
                    </span>
                  </label>
                  {/* Item reprovado ganha campo de observação — coluna já existia desde a
                      Sprint 9, mas nunca tinha ganho UI (achado da auditoria da Missão 2). */}
                  {reprovado && checklist.status === 'aberto' && (
                    <input
                      type="text"
                      defaultValue={item.observacao ?? ''}
                      placeholder="Motivo da reprovação (opcional)"
                      onBlur={(e) => {
                        if (e.target.value !== (item.observacao ?? '')) {
                          responder.mutate({ itemId: item.id, payload: { resposta: false, observacao: e.target.value || null } });
                        }
                      }}
                      className="mt-1 ml-7 w-[calc(100%-1.75rem)] rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-transparent"
                    />
                  )}
                  {reprovado && checklist.status !== 'aberto' && item.observacao && (
                    <p className="mt-0.5 ml-7 text-xs text-neutral-500">Motivo: {item.observacao}</p>
                  )}
                </div>
              );
            })}
          </div>

          {transicoes.length > 0 && (
            <div className="mt-3 flex items-center justify-end gap-2 border-t border-neutral-100 pt-3 dark:border-white/5">
              <Select
                value={checklist.status}
                onChange={(e) => {
                  const status = e.target.value as ChecklistStatus;
                  updateStatus.mutate(
                    { id: checklist.id, status },
                    { onSuccess: () => toast.success(`Checklist ${CHECKLIST_STATUS_LABEL[status].toLowerCase()}`) }
                  );
                }}
                className="h-8 max-w-[10rem] text-xs"
              >
                <option value={checklist.status}>{CHECKLIST_STATUS_LABEL[checklist.status]}</option>
                {transicoes.map((proximo) => (
                  <option key={proximo} value={proximo}>
                    {CHECKLIST_STATUS_LABEL[proximo]}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Painel genérico de Checklists — mesmo padrão de entidade_tipo/entidade_id de
// ComentariosPanel/TimelinePanel (shared/capabilities/components/), mas mora em
// features/operacoes/ porque é ali que a capability `checklists` vive de verdade (Sprint 9,
// DEC-059). Primeiro consumidor real: Cockpit do Veículo (Fase 4 da missão "MVP Operacional",
// 2026-08-06) — entrega/devolução/vistoria são, sobretudo, operações de Veículo.
export function ChecklistsPanel({ entidadeTipo, entidadeId }: { entidadeTipo: string; entidadeId: string }) {
  const { data: checklists, isLoading } = useChecklistsPorEntidade(entidadeTipo, entidadeId);
  const [dialogAberto, setDialogAberto] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button type="button" size="sm" onClick={() => setDialogAberto(true)}>
          <Plus className="h-4 w-4" />
          Novo checklist
        </Button>
      </div>

      {isLoading && <div className="h-32 cockpit-shimmer rounded-2xl" />}

      {!isLoading && (checklists?.length ?? 0) === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title="Nenhum checklist ainda"
          description="Entrega, devolução, vistoria semanal, vistoria extraordinária ou troca de motorista — crie o primeiro a partir de um modelo."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setDialogAberto(true)}>
              Criar checklist
            </Button>
          }
        />
      )}

      {!isLoading && (checklists?.length ?? 0) > 0 && (
        <div className="space-y-2.5">
          {checklists!.map((checklist) => (
            <ChecklistCard key={checklist.id} checklist={checklist} />
          ))}
        </div>
      )}

      <NovoChecklistDialog open={dialogAberto} onOpenChange={setDialogAberto} entidadeTipo={entidadeTipo} entidadeId={entidadeId} />
    </div>
  );
}
