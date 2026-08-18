import { useState } from 'react';
import { Send, PenLine, XCircle } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples } from '@/shared/lib/format';
import { useAssinaturas, useMudarStatusAssinatura, usePrepararAssinaturas } from '../hooks';
import {
  CONTRATO_ASSINATURA_STATUS_LABEL,
  CONTRATO_PARTE_LABEL,
  type ContratoAssinatura,
  type ContratoAssinaturaStatus,
} from '../types';

const VARIANTE_ASSINATURA: Record<ContratoAssinaturaStatus, 'secondary' | 'info' | 'warning' | 'success' | 'destructive' | 'outline'> = {
  nao_enviado: 'secondary',
  enviado: 'info',
  visualizado: 'info',
  aceito: 'success',
  assinado: 'success',
  recusado: 'destructive',
  expirado: 'destructive',
  cancelado: 'outline',
};

// Painel de assinaturas de UMA versão (staff). O workflow é o do banco (contrato_assinaturas):
// enviar -> motorista assina no app dele (RLS: só a linha parte='motorista') -> staff registra a
// assinatura da PrimeCharge. NÃO inventamos assinatura digital com equivalência jurídica (regra
// 23): o que se registra aqui é o RASTRO (status + datas + evidências); integração com provedor
// especializado entra depois nesta mesma estrutura (sendForSignature ≈ mudarStatus 'enviado').
export function AssinaturasPanel({
  versaoId,
  empresaId,
  versaoAguardandoAssinatura,
}: {
  versaoId: string;
  empresaId: string | undefined;
  versaoAguardandoAssinatura: boolean;
}) {
  const { data: assinaturas, isLoading } = useAssinaturas(versaoId);
  const preparar = usePrepararAssinaturas();
  const mudar = useMudarStatusAssinatura();
  const [confirmar, setConfirmar] = useState<{ assinatura: ContratoAssinatura; alvo: ContratoAssinaturaStatus } | null>(null);

  if (isLoading) return <p className="text-sm text-neutral-500">Carregando assinaturas…</p>;

  if (!assinaturas || assinaturas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
        <p>Nenhuma linha de assinatura criada para esta versão.</p>
        {versaoAguardandoAssinatura && empresaId && (
          <Button
            size="sm"
            className="mt-3"
            disabled={preparar.isPending}
            onClick={() =>
              preparar.mutate(
                { empresaId, versaoId },
                {
                  onSuccess: () => toast.success('Assinaturas preparadas', 'Motorista e PrimeCharge adicionados.'),
                  onError: (e) => toast.error('Não foi possível preparar', extrairMensagemDeErro(e)),
                },
              )
            }
          >
            <PenLine className="h-4 w-4" /> Preparar assinaturas (motorista + PrimeCharge)
          </Button>
        )}
      </div>
    );
  }

  const executar = (assinatura: ContratoAssinatura, alvo: ContratoAssinaturaStatus) => {
    mudar.mutate(
      {
        id: assinatura.id,
        status: alvo,
        evidencia:
          alvo === 'assinado'
            ? { ...assinatura.evidencia, registrado_por: 'staff', user_agent: navigator.userAgent }
            : undefined,
      },
      {
        onSuccess: () => toast.success('Assinatura atualizada', CONTRATO_ASSINATURA_STATUS_LABEL[alvo]),
        onError: (e) => toast.error('Não foi possível atualizar', extrairMensagemDeErro(e)),
      },
    );
  };

  return (
    <div className="space-y-2">
      {assinaturas.map((a) => (
        <div
          key={a.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-800"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{CONTRATO_PARTE_LABEL[a.parte]}</p>
            <p className="text-xs text-neutral-500">
              {a.enviado_em && `Enviado ${formatDataSimples(a.enviado_em)}`}
              {a.visualizado_em && ` · Visualizado ${formatDataSimples(a.visualizado_em)}`}
              {a.assinado_em && ` · Assinado ${formatDataSimples(a.assinado_em)}`}
              {a.motivo_recusa && ` · Motivo: ${a.motivo_recusa}`}
              {!a.enviado_em && !a.assinado_em && !a.motivo_recusa && 'Sem movimentação'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={VARIANTE_ASSINATURA[a.status]}>{CONTRATO_ASSINATURA_STATUS_LABEL[a.status]}</Badge>
            {a.parte === 'motorista' && a.status === 'nao_enviado' && (
              <Button size="sm" variant="outline" disabled={mudar.isPending} onClick={() => executar(a, 'enviado')}>
                <Send className="h-3.5 w-3.5" /> Enviar ao motorista
              </Button>
            )}
            {a.parte === 'primecharge' && !['assinado', 'cancelado'].includes(a.status) && (
              <Button size="sm" variant="outline" disabled={mudar.isPending} onClick={() => setConfirmar({ assinatura: a, alvo: 'assinado' })}>
                <PenLine className="h-3.5 w-3.5" /> Registrar assinatura PrimeCharge
              </Button>
            )}
            {!['assinado', 'cancelado', 'recusado'].includes(a.status) && (
              <Button size="sm" variant="ghost" disabled={mudar.isPending} onClick={() => setConfirmar({ assinatura: a, alvo: 'cancelado' })}>
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
      <p className="text-[11px] leading-snug text-neutral-400">
        O registro acima é o rastro operacional da assinatura (status, datas e evidências) — não constitui, por si só,
        assinatura com certificado digital. Integração com plataforma especializada de assinatura entra nesta mesma
        estrutura futuramente.
      </p>
      <ConfirmDialog
        open={confirmar !== null}
        onOpenChange={(v) => !v && setConfirmar(null)}
        title={confirmar?.alvo === 'assinado' ? 'Registrar assinatura da PrimeCharge?' : 'Cancelar esta assinatura?'}
        description={
          confirmar?.alvo === 'assinado'
            ? 'Confirma que a PrimeCharge assinou este documento? A data e o registro ficam na auditoria.'
            : 'A linha de assinatura será marcada como cancelada.'
        }
        confirmLabel={confirmar?.alvo === 'assinado' ? 'Registrar' : 'Cancelar assinatura'}
        destructive={confirmar?.alvo === 'cancelado'}
        isPending={mudar.isPending}
        onConfirm={() => {
          if (confirmar) executar(confirmar.assinatura, confirmar.alvo);
          setConfirmar(null);
        }}
      />
    </div>
  );
}
