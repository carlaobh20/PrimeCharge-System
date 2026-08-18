import { useState } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { formatarMoedaInput, digitosParaReais } from '@/shared/lib/moedaInput';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { cn } from '@/shared/lib/utils';
import { useCreateRescisao, useFichaJuridica, useRescisoes, useUpdateRescisao } from '../hooksFase3';
import {
  CHECKLIST_ENCERRAMENTO,
  RESCISAO_STATUS_LABEL,
  RESCISAO_TRANSITIONS,
  type ContratoRescisao,
  type RescisaoStatus,
} from '../apiFase3';

// RESCISÃO (regras 16–18): workflow com state machine (trigger 0044 valida; aqui só se oferecem
// as transições possíveis), checklist de encerramento (o banco EXIGE o núcleo antes de
// 'encerrada') e apuração financeira REGISTRADA — nenhuma penalidade calculada automaticamente
// (multa rescisória é decisão de advogado, parametrizável). O contrato nunca é apagado.

const VARIANTE_STATUS: Record<RescisaoStatus, 'secondary' | 'info' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  solicitada: 'warning',
  em_analise: 'info',
  aprovada: 'info',
  agendada: 'info',
  devolucao_pendente: 'warning',
  devolvido: 'info',
  encerrada: 'success',
  cancelada: 'outline',
};

const CAMPOS_VALORES: { chave: string; rotulo: string }[] = [
  { chave: 'saldo_devedor', rotulo: 'Saldo devedor' },
  { chave: 'valores_vencidos', rotulo: 'Valores vencidos' },
  { chave: 'multas', rotulo: 'Multas' },
  { chave: 'danos', rotulo: 'Danos apurados' },
  { chave: 'caucao', rotulo: 'Caução retida/devolvida' },
  { chave: 'creditos', rotulo: 'Créditos do motorista' },
  { chave: 'valor_final', rotulo: 'Valor final apurado' },
];

export function RescisaoPanel({ contratoId, empresaId }: { contratoId: string; empresaId: string | undefined }) {
  const { data: usuario } = useCurrentUsuario();
  const { data: rescisoes, isLoading } = useRescisoes(contratoId);
  const ficha = useFichaJuridica(contratoId);
  const criar = useCreateRescisao();
  const atualizar = useUpdateRescisao();

  const [motivo, setMotivo] = useState('');
  const [solicitante, setSolicitante] = useState<'motorista' | 'empresa' | 'acordo'>('empresa');

  const ativa: ContratoRescisao | undefined = rescisoes?.find((r) => !['encerrada', 'cancelada'].includes(r.status));
  const historico = rescisoes?.filter((r) => r.id !== ativa?.id) ?? [];

  if (isLoading) return <p className="text-sm text-neutral-500">Carregando…</p>;

  const marcarChecklist = (chave: string, valor: boolean) => {
    if (!ativa) return;
    atualizar.mutate(
      { id: ativa.id, payload: { checklist: { ...ativa.checklist, [chave]: valor } } },
      { onError: (e) => toast.error('Não foi possível atualizar o checklist', extrairMensagemDeErro(e)) },
    );
  };

  const gravarValor = (chave: string, valor: number) => {
    if (!ativa) return;
    atualizar.mutate(
      { id: ativa.id, payload: { valores: { ...ativa.valores, [chave]: valor } } },
      { onError: (e) => toast.error('Não foi possível gravar o valor', extrairMensagemDeErro(e)) },
    );
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Financeiro derivado — sempre visível como referência da apuração */}
      {ficha.data && (
        <div className="grid gap-3 rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800 md:grid-cols-4">
          <div>
            <p className="text-xs text-neutral-400">Receitas confirmadas</p>
            <p className="font-semibold">{formatMoeda(ficha.data.financeiro.receitasConfirmadas)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Pendentes</p>
            <p className="font-semibold">{formatMoeda(ficha.data.financeiro.receitasPendentes)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Vencidas</p>
            <p className="font-semibold text-red-600">{formatMoeda(ficha.data.financeiro.receitasVencidas)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">Multas / Sinistros registrados</p>
            <p className="font-semibold">
              {ficha.data.multas.length} / {ficha.data.sinistros.length}
            </p>
          </div>
        </div>
      )}

      {!ativa && (
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Solicitar rescisão</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Motivo (obrigatório)</Label>
              <Textarea className="mt-1" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo da rescisão…" />
            </div>
            <div>
              <Label>Solicitante</Label>
              <Select value={solicitante} onChange={(e) => setSolicitante(e.target.value as typeof solicitante)} className="mt-1">
                <option value="empresa">Empresa</option>
                <option value="motorista">Motorista</option>
                <option value="acordo">Acordo entre as partes</option>
              </Select>
              <Button
                className="mt-3 w-full"
                disabled={motivo.trim().length < 5 || !empresaId || criar.isPending}
                onClick={() =>
                  criar.mutate(
                    { empresaId: empresaId!, payload: { contrato_id: contratoId, motivo: motivo.trim(), solicitante, solicitado_por: usuario?.id ?? null } },
                    {
                      onSuccess: () => {
                        toast.success('Rescisão solicitada', 'Workflow iniciado — nada foi apagado.');
                        setMotivo('');
                      },
                      onError: (e) => toast.error('Não foi possível solicitar', extrairMensagemDeErro(e)),
                    },
                  )
                }
              >
                Solicitar
              </Button>
            </div>
          </div>
        </div>
      )}

      {ativa && (
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Rescisão em andamento <span className="text-neutral-400">({ativa.solicitante}, {formatDataSimples(ativa.criado_em)})</span>
            </p>
            <Badge variant={VARIANTE_STATUS[ativa.status]}>{RESCISAO_STATUS_LABEL[ativa.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-500">Motivo: {ativa.motivo}</p>

          {/* Transições válidas */}
          <div className="mt-3 flex flex-wrap gap-2">
            {RESCISAO_TRANSITIONS[ativa.status].map((alvo) => (
              <Button
                key={alvo}
                size="sm"
                variant={alvo === 'cancelada' ? 'ghost' : 'outline'}
                className={cn(alvo === 'cancelada' && 'text-red-600')}
                disabled={atualizar.isPending}
                onClick={() =>
                  atualizar.mutate(
                    { id: ativa.id, payload: { status: alvo } },
                    {
                      onSuccess: () => toast.success('Rescisão atualizada', RESCISAO_STATUS_LABEL[alvo]),
                      onError: (e) => toast.error('Transição recusada', extrairMensagemDeErro(e)),
                    },
                  )
                }
              >
                {RESCISAO_STATUS_LABEL[alvo]}
              </Button>
            ))}
          </div>

          {/* Checklist de encerramento */}
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Checklist de encerramento</p>
            <p className="mb-2 text-[11px] text-neutral-400">
              Os itens marcados com * são obrigatórios — o banco recusa o encerramento sem eles.
            </p>
            <div className="grid gap-1.5 md:grid-cols-2">
              {CHECKLIST_ENCERRAMENTO.map((item) => (
                <label key={item.chave} className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                  <input
                    type="checkbox"
                    checked={ativa.checklist[item.chave] === true}
                    onChange={(e) => marcarChecklist(item.chave, e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {item.rotulo}
                    {item.nucleo && <span className="text-red-500"> *</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Apuração financeira registrada */}
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Apuração financeira (registrada)</p>
            <p className="mb-2 text-[11px] text-neutral-400">
              Valores REGISTRADOS pela operação. Nenhuma penalidade é calculada automaticamente — multa rescisória depende de regra
              aprovada por advogado.
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {CAMPOS_VALORES.map((c) => (
                <div key={c.chave} className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-normal text-neutral-500">{c.rotulo}</Label>
                  <Input
                    inputMode="numeric"
                    className="h-8 w-40 text-right text-xs"
                    value={formatarMoedaInput(Number(ativa.valores[c.chave] ?? 0))}
                    onChange={(e) => gravarValor(c.chave, digitosParaReais(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {historico.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Histórico de rescisões</p>
          <div className="space-y-1.5">
            {historico.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                <span className="truncate text-neutral-600 dark:text-neutral-300">
                  {formatDataSimples(r.criado_em)} · {r.motivo}
                </span>
                <Badge variant={VARIANTE_STATUS[r.status]}>{RESCISAO_STATUS_LABEL[r.status]}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
