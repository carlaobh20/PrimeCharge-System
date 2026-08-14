import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, CircleDashed, Loader2, MinusCircle, XCircle } from 'lucide-react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';
import { cn } from '@/shared/lib/utils';
import {
  useChecklist,
  useChecklistsPorEntidade,
  useConcluirVistoria,
  useCreateVistoria,
  useRemoveFotoItem,
  useResponderChecklistItem,
  useUpdateVistoriaCampos,
  useUploadAssinaturaVistoria,
  useUploadFotoItem,
} from '../hooks/useChecklists';
import { getUrlAssinada } from '../api/checklists';
import { SignaturePad } from './SignaturePad';
import type { ChecklistItem, ChecklistTipo } from '../types';

type ItemRowProps = {
  item: ChecklistItem;
  checklistId: string;
  empresaId: string;
  bloqueado: boolean;
};

// Épico 8, ETAPA 8 — cada item vira evidência real: OK / Não OK / Não se aplica + observação +
// foto (obrigatória quando reprovado — a mesma regra que o banco exige na conclusão, aqui só
// pra dar feedback imediato em vez de deixar o erro estourar só no fim).
function ItemRow({ item, checklistId, empresaId, bloqueado }: ItemRowProps) {
  const responder = useResponderChecklistItem();
  const uploadFoto = useUploadFotoItem();
  const removerFoto = useRemoveFotoItem();
  const [fotoUrlAssinada, setFotoUrlAssinada] = useState<string | null>(null);

  useEffect(() => {
    if (item.foto_url) {
      getUrlAssinada(item.foto_url).then(setFotoUrlAssinada).catch(() => setFotoUrlAssinada(null));
    } else {
      setFotoUrlAssinada(null);
    }
  }, [item.foto_url]);

  const reprovado = item.aplicavel && item.resposta === false;
  const precisaFoto = reprovado && !item.foto_url;

  function marcar(resposta: boolean | null, aplicavel = true) {
    responder.mutate({ itemId: item.id, payload: { resposta, observacao: item.observacao, aplicavel } });
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFoto.mutate({ itemId: item.id, checklistId, empresaId, file });
    e.target.value = '';
  }

  return (
    <div className={cn('rounded-lg border border-neutral-100 p-3 dark:border-white/5', precisaFoto && 'border-amber-300 dark:border-amber-700/50')}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-800 dark:text-neutral-200">{item.descricao}</p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            title="OK"
            disabled={bloqueado}
            onClick={() => marcar(true)}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              item.aplicavel && item.resposta === true ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40' : 'text-neutral-300 hover:bg-neutral-100 dark:text-neutral-600'
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Não OK"
            disabled={bloqueado}
            onClick={() => marcar(false)}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              reprovado ? 'bg-red-100 text-red-700 dark:bg-red-900/40' : 'text-neutral-300 hover:bg-neutral-100 dark:text-neutral-600'
            )}
          >
            <XCircle className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Não se aplica"
            disabled={bloqueado}
            onClick={() => marcar(null, false)}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              !item.aplicavel ? 'bg-neutral-200 text-neutral-700 dark:bg-white/10' : 'text-neutral-300 hover:bg-neutral-100 dark:text-neutral-600'
            )}
          >
            <MinusCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {item.aplicavel && item.resposta === null && !bloqueado && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-400">
          <CircleDashed className="h-3 w-3" /> Ainda não respondido
        </p>
      )}

      {reprovado && (
        <div className="mt-2 space-y-2">
          <Input
            placeholder="O que foi encontrado? (opcional, mas recomendado)"
            defaultValue={item.observacao ?? ''}
            disabled={bloqueado}
            onBlur={(e) => {
              if (e.target.value !== (item.observacao ?? '')) marcar(false);
            }}
            className="h-8 text-xs"
          />
          {fotoUrlAssinada ? (
            <div className="flex items-center gap-2">
              <img src={fotoUrlAssinada} alt={`Foto de ${item.descricao}`} className="h-16 w-16 rounded-md object-cover" />
              {!bloqueado && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => item.foto_url && removerFoto.mutate({ itemId: item.id, fotoUrl: item.foto_url })}
                >
                  Remover foto
                </Button>
              )}
            </div>
          ) : (
            !bloqueado && (
              <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-amber-400 px-2 py-1 text-xs text-amber-700 dark:text-amber-400">
                <Camera className="h-3.5 w-3.5" />
                {precisaFoto ? 'Foto obrigatória (avaria marcada)' : 'Adicionar foto'}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
              </label>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function VistoriaDialog({
  open,
  onOpenChange,
  tipo,
  empresaId,
  veiculoId,
  veiculoLabel,
  contratoId,
  motoristaId,
  motoristaLabel,
  checklistAnteriorId,
  onConcluida,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: Extract<ChecklistTipo, 'entrega' | 'devolucao'>;
  empresaId: string | undefined;
  veiculoId: string;
  veiculoLabel: string;
  contratoId: string;
  motoristaId: string;
  motoristaLabel: string;
  checklistAnteriorId?: string | null;
  onConcluida?: () => void;
}) {
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [odometro, setOdometro] = useState('');
  const [carga, setCarga] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [destino, setDestino] = useState<'disponivel' | 'manutencao'>('disponivel');
  const [houveSinistro, setHouveSinistro] = useState(false);
  const [confirmacao, setConfirmacao] = useState(false);
  const [assinaturaBlob, setAssinaturaBlob] = useState<Blob | null>(null);

  const criar = useCreateVistoria();
  const { data: checklist, isLoading } = useChecklist(checklistId ?? undefined);
  const atualizarCampos = useUpdateVistoriaCampos();
  const uploadAssinatura = useUploadAssinaturaVistoria();
  const concluir = useConcluirVistoria();

  // O índice único `uq_checklists_contrato_tipo_aberto` (migration 0030) só permite UMA
  // vistoria aberta por contrato+tipo — então "Continuar depois" seguido de reabrir o dialog
  // precisa RETOMAR a vistoria em andamento, nunca criar outra (senão a 2ª tentativa de criar
  // esbarraria nesse índice). `useChecklistsPorEntidade` já é buscado no cockpit do veículo;
  // aqui a busca é local ao dialog porque o dialog não sabe se o pai já tem esse dado.
  const { data: checklistsDoVeiculo } = useChecklistsPorEntidade('veiculo', veiculoId);
  const retomouNestaAbertura = useRef(false);

  useEffect(() => {
    if (!open) {
      setChecklistId(null);
      setOdometro('');
      setCarga('');
      setObservacoes('');
      setDestino('disponivel');
      setHouveSinistro(false);
      setConfirmacao(false);
      setAssinaturaBlob(null);
      retomouNestaAbertura.current = false;
      return;
    }
    if (retomouNestaAbertura.current || checklistId || !checklistsDoVeiculo) return;
    const emAndamento = checklistsDoVeiculo.find((c) => c.tipo === tipo && c.contrato_id === contratoId && c.status === 'aberto');
    if (emAndamento) setChecklistId(emAndamento.id);
    retomouNestaAbertura.current = true;
  }, [open, checklistId, checklistsDoVeiculo, tipo, contratoId]);

  const titulo = tipo === 'entrega' ? 'Vistoria de entrega' : 'Vistoria de devolução';

  function handleIniciar() {
    if (!empresaId) return;
    criar.mutate(
      {
        empresaId,
        input: {
          tipo,
          veiculoId,
          contratoId,
          motoristaId,
          titulo: `${titulo} — ${veiculoLabel}`,
          checklistAnteriorId: checklistAnteriorId ?? null,
        },
      },
      { onSuccess: (data) => setChecklistId(data.id) }
    );
  }

  const itens = checklist?.itens ?? [];
  const itensAplicaveis = itens.filter((i) => i.aplicavel);
  const itensPendentes = itensAplicaveis.filter((i) => i.resposta === null).length;
  const itensReprovadosSemFoto = itensAplicaveis.filter((i) => i.resposta === false && !i.foto_url).length;

  const bloqueado = checklist?.status === 'concluido' || checklist?.status === 'cancelado';

  const prontoParaFinalizar =
    !!checklist &&
    odometro !== '' &&
    carga !== '' &&
    itensPendentes === 0 &&
    itensReprovadosSemFoto === 0 &&
    confirmacao &&
    (!!assinaturaBlob || !!checklist.assinatura_url) &&
    (tipo !== 'devolucao' || (!!destino && (!houveSinistro || destino === 'manutencao')));

  async function handleFinalizar() {
    if (!checklist) return;
    try {
      await atualizarCampos.mutateAsync({
        id: checklist.id,
        payload: {
          odometro_km: Number(odometro),
          carga_pct: Number(carga),
          observacoes: observacoes || null,
          ...(tipo === 'devolucao' ? { destino_veiculo: destino, houve_sinistro: houveSinistro } : {}),
        },
      });

      if (assinaturaBlob) {
        await uploadAssinatura.mutateAsync({ checklistId: checklist.id, empresaId: empresaId!, blob: assinaturaBlob });
      }

      await concluir.mutateAsync({
        id: checklist.id,
        payload: {
          confirmacaoMotorista: confirmacao,
          destinoVeiculo: tipo === 'devolucao' ? destino : null,
          houveSinistro: tipo === 'devolucao' ? houveSinistro : false,
        },
      });

      toast.success(tipo === 'entrega' ? 'Entrega registrada — contrato ativo' : 'Devolução registrada — contrato encerrado');
      onOpenChange(false);
      onConcluida?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível concluir a vistoria');
    }
  }

  const salvando = criar.isPending || atualizarCampos.isPending || uploadAssinatura.isPending || concluir.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={titulo}
      description={`${veiculoLabel} · ${motoristaLabel}`}
      className="max-w-2xl max-h-[88vh] overflow-y-auto"
    >
      {!checklistId && !checklist && (
        <div className="space-y-4 py-2 text-center">
          <p className="text-sm text-neutral-500">
            Nenhuma vistoria de {tipo === 'entrega' ? 'entrega' : 'devolução'} em andamento pra este contrato. Ao iniciar, o checklist
            padrão é criado — odômetro, carga, itens, fotos e assinatura ficam registrados aqui, e {tipo === 'entrega' ? 'o contrato só ativa' : 'o contrato só encerra'}{' '}
            quando a vistoria for concluída.
          </p>
          <Button type="button" onClick={handleIniciar} disabled={criar.isPending}>
            {criar.isPending ? 'Iniciando…' : `Iniciar vistoria de ${tipo === 'entrega' ? 'entrega' : 'devolução'}`}
          </Button>
        </div>
      )}

      {(checklistId || checklist) && (isLoading || !checklist) && <div className="h-40 cockpit-shimmer rounded-2xl" />}

      {checklist && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quilometragem *</Label>
              <Input
                type="number"
                min={0}
                value={odometro || checklist.odometro_km?.toString() || ''}
                disabled={bloqueado}
                onChange={(e) => setOdometro(e.target.value)}
              />
            </div>
            <div>
              <Label>Carga da bateria (%) *</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={carga || checklist.carga_pct?.toString() || ''}
                disabled={bloqueado}
                onChange={(e) => setCarga(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Observações gerais</Label>
            <Textarea
              rows={2}
              value={observacoes || checklist.observacoes || ''}
              disabled={bloqueado}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Qualquer observação que não se encaixe em um item específico…"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Checklist</Label>
              <span className="text-xs text-neutral-400">
                {itensAplicaveis.filter((i) => i.resposta !== null).length}/{itensAplicaveis.length} respondidos
              </span>
            </div>
            <div className="space-y-2">
              {itens.map((item) => (
                <ItemRow key={item.id} item={item} checklistId={checklist.id} empresaId={empresaId!} bloqueado={!!bloqueado} />
              ))}
            </div>
          </div>

          {tipo === 'devolucao' && (
            <div className="space-y-3 rounded-xl border border-neutral-100 p-3 dark:border-white/5">
              <div>
                <Label>Destino do veículo *</Label>
                <Select value={destino} disabled={!!bloqueado} onChange={(e) => setDestino(e.target.value as 'disponivel' | 'manutencao')}>
                  <option value="disponivel">Disponível</option>
                  <option value="manutencao">Manutenção</option>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={houveSinistro}
                  disabled={!!bloqueado}
                  onChange={(e) => {
                    setHouveSinistro(e.target.checked);
                    if (e.target.checked) setDestino('manutencao');
                  }}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                Houve sinistro (colisão, avaria significativa) identificado nesta vistoria
              </label>
              {houveSinistro && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Um registro será criado em Sinistros com o que foi observado — detalhe valor/seguradora/franquia depois, na tela de
                  sinistros.
                </p>
              )}
            </div>
          )}

          <div>
            <Label>Assinatura do motorista *</Label>
            {checklist.assinatura_url && !assinaturaBlob ? (
              <p className="mt-1 text-xs text-emerald-600">Assinatura já registrada.</p>
            ) : (
              <SignaturePad onChange={setAssinaturaBlob} />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={confirmacao}
              disabled={!!bloqueado}
              onChange={(e) => setConfirmacao(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Confirmo que os dados desta vistoria foram conferidos com {motoristaLabel}, presente no momento
          </label>

          {!bloqueado && (
            <div className="flex justify-end gap-3 border-t border-neutral-100 pt-3 dark:border-white/5">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Continuar depois
              </Button>
              <Button type="button" disabled={!prontoParaFinalizar || salvando} onClick={handleFinalizar}>
                {salvando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Finalizando…
                  </>
                ) : (
                  `Finalizar vistoria e ${tipo === 'entrega' ? 'ativar contrato' : 'encerrar contrato'}`
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
