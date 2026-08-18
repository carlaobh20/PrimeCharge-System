import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListTodo, Plus } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples } from '@/shared/lib/format';
import { createAcao, listAcoes, updateAcaoStatus } from '@/features/operacoes/api/acoes';
import {
  ACAO_PRIORIDADE_LABEL,
  ACAO_STATUS_LABEL,
  ACAO_STATUS_TRANSITIONS,
  type AcaoPrioridade,
  type AcaoStatus,
} from '@/features/operacoes/types';

// TAREFAS JURÍDICAS (Fase G) — REUSO TOTAL de acoes_operacionais (a missão manda: se existir
// sistema de tarefas, reutilizar). Uma tarefa jurídica é uma ação operacional com
// entidade_tipo='contrato' e tipo prefixado 'juridico'. State machine, RLS (staff-only na
// leitura desde a 0036), auditoria e histórico já existem lá — nada foi duplicado.
// "Não permitir apagar histórico" (Fase D): ação concluída/cancelada permanece; não há delete.

const VARIANTE_STATUS: Record<AcaoStatus, 'secondary' | 'info' | 'success' | 'outline'> = {
  pendente: 'secondary',
  em_andamento: 'info',
  concluida: 'success',
  cancelada: 'outline',
};

export function TarefasJuridicasPanel({ contratoId, empresaId }: { contratoId: string; empresaId: string | undefined }) {
  const qc = useQueryClient();
  const tarefas = useQuery({
    queryKey: ['juridico', 'tarefas', contratoId],
    queryFn: () => listAcoes({ entidadeTipo: 'contrato', entidadeId: contratoId }),
  });
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'media' as AcaoPrioridade, prazo: '' });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['juridico', 'tarefas', contratoId] });

  const criar = useMutation({
    mutationFn: () =>
      createAcao(empresaId!, {
        titulo: form.titulo.trim(),
        descricao: form.descricao || null,
        tipo: 'juridico_tarefa',
        prioridade: form.prioridade,
        prazo: form.prazo || null,
        entidade_tipo: 'contrato',
        entidade_id: contratoId,
      }),
    onSuccess: () => {
      toast.success('Tarefa criada');
      setCriando(false);
      setForm({ titulo: '', descricao: '', prioridade: 'media', prazo: '' });
      invalidar();
    },
    onError: (e) => toast.error('Não foi possível criar a tarefa', extrairMensagemDeErro(e)),
  });

  const mudarStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AcaoStatus }) => updateAcaoStatus(id, status),
    onSuccess: () => invalidar(),
    onError: (e) => toast.error('Transição recusada', extrairMensagemDeErro(e)),
  });

  const lista = tarefas.data ?? [];

  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          Tarefas vinculadas a este contrato — mesmas Ações Operacionais do resto do sistema (fonte única, sem duplicação).
        </p>
        <Button size="sm" onClick={() => setCriando(true)} disabled={!empresaId}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Nova tarefa
        </Button>
      </div>

      {tarefas.isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
      {!tarefas.isLoading && lista.length === 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-700">
          <ListTodo className="h-4 w-4" aria-hidden /> Nenhuma tarefa para este contrato.
        </p>
      )}

      <div className="space-y-2">
        {lista.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{t.titulo}</p>
              <p className="text-xs text-neutral-500">
                {ACAO_PRIORIDADE_LABEL[t.prioridade]}
                {t.prazo && ` · prazo ${formatDataSimples(t.prazo)}`}
                {t.responsavel?.nome_completo && ` · ${t.responsavel.nome_completo}`}
                {t.descricao && ` — ${t.descricao}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Badge variant={VARIANTE_STATUS[t.status]}>{ACAO_STATUS_LABEL[t.status]}</Badge>
              {ACAO_STATUS_TRANSITIONS[t.status].map((alvo) => (
                <Button
                  key={alvo}
                  size="sm"
                  variant="ghost"
                  disabled={mudarStatus.isPending}
                  onClick={() => mudarStatus.mutate({ id: t.id, status: alvo })}
                >
                  {ACAO_STATUS_LABEL[alvo]}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={criando} onOpenChange={setCriando} title="Nova tarefa jurídica" description="A tarefa fica vinculada a este contrato e aparece também nas Ações Operacionais.">
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input className="mt-1" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex.: Cobrar apólice do seguro" />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea className="mt-1" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prioridade</Label>
              <Select className="mt-1" value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value as AcaoPrioridade }))}>
                {Object.entries(ACAO_PRIORIDADE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Prazo (opcional)</Label>
              <Input type="date" className="mt-1" value={form.prazo} onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCriando(false)}>
              Cancelar
            </Button>
            <Button disabled={form.titulo.trim().length < 3 || criar.isPending} onClick={() => criar.mutate()}>
              {criar.isPending ? 'Criando…' : 'Criar tarefa'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
