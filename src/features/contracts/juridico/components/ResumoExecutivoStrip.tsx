import { useMemo } from 'react';
import { ArrowRight, CalendarClock, FileSignature, ShieldCheck } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { formatDataSimples } from '@/shared/lib/format';
import type { ContratoComRelacoes } from '../../types';
import type { ContratoVersao } from '../types';
import { useAssinaturas } from '../hooks';
import { useFichaJuridica } from '../hooksFase3';
import { montarResumoExecutivo } from '../resumoExecutivo';

// RESUMO EXECUTIVO (Fase C) — faixa no topo do cockpit: status, prazo, assinatura, seguro,
// pendências, última atividade e PRÓXIMA AÇÃO (motor puro resumoExecutivo.ts, prioridade
// objetiva). Status OPERACIONAL — nunca "segurança jurídica".

const DIA = 86400000;

export function ResumoExecutivoStrip({
  contrato,
  versao,
  pendencias,
  ultimaAtividade,
}: {
  contrato: ContratoComRelacoes;
  versao: ContratoVersao | undefined;
  pendencias: number;
  ultimaAtividade: string | null;
}) {
  const { data: assinaturas } = useAssinaturas(versao?.id);
  const ficha = useFichaJuridica(contrato.id);

  const resumo = useMemo(() => {
    const doMotorista = assinaturas?.find((a) => a.parte === 'motorista');
    const daPrimecharge = assinaturas?.find((a) => a.parte === 'primecharge');
    const seguro = ficha.data?.seguros?.[0];
    const rescisaoAtiva = ficha.data?.rescisoes?.find((r) => !['encerrada', 'cancelada'].includes(r.status));
    return montarResumoExecutivo({
      statusContrato: contrato.status,
      diasParaFim: contrato.data_fim_prevista ? Math.ceil((new Date(contrato.data_fim_prevista).getTime() - Date.now()) / DIA) : null,
      statusVersaoAtual: versao?.status ?? null,
      assinaturaMotorista: doMotorista?.status ?? null,
      assinaturaPrimecharge: daPrimecharge?.status ?? null,
      assinaturaExpiraEmDias:
        doMotorista?.expira_em && !['assinado', 'aceito'].includes(doMotorista.status)
          ? Math.ceil((new Date(doMotorista.expira_em).getTime() - Date.now()) / DIA)
          : null,
      seguroCadastrado: (ficha.data?.seguros.length ?? 0) > 0,
      seguroVenceEmDias: seguro?.vigencia_fim ? Math.ceil((new Date(seguro.vigencia_fim).getTime() - Date.now()) / DIA) : null,
      pendencias,
      rescisaoStatus: rescisaoAtiva?.status ?? null,
      ultimaAtividade,
    });
  }, [contrato, versao, assinaturas, ficha.data, pendencias, ultimaAtividade]);

  const ASSINATURA_LABEL = {
    concluida: { texto: 'Concluída', v: 'success' as const },
    pendente: { texto: 'Pendente', v: 'warning' as const },
    recusada: { texto: 'Recusada', v: 'destructive' as const },
    expirando: { texto: 'Expirando', v: 'destructive' as const },
    nao_iniciada: { texto: 'Não iniciada', v: 'secondary' as const },
  }[resumo.situacaoAssinatura];
  const SEGURO_LABEL = {
    vigente: { texto: 'Vigente', v: 'success' as const },
    vencendo: { texto: 'Vencendo', v: 'warning' as const },
    vencido: { texto: 'Vencido', v: 'destructive' as const },
    ausente: { texto: 'Ausente', v: 'secondary' as const },
  }[resumo.situacaoSeguro];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950">
      <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
        <CalendarClock className="h-4 w-4 text-neutral-400" aria-hidden />
        {resumo.prazoTexto}
      </span>
      <span className="flex items-center gap-1.5">
        <FileSignature className="h-4 w-4 text-neutral-400" aria-hidden />
        <span className="text-neutral-500">Assinatura:</span>
        <Badge variant={ASSINATURA_LABEL.v}>{ASSINATURA_LABEL.texto}</Badge>
      </span>
      <span className="flex items-center gap-1.5">
        <ShieldCheck className="h-4 w-4 text-neutral-400" aria-hidden />
        <span className="text-neutral-500">Seguro:</span>
        <Badge variant={SEGURO_LABEL.v}>{SEGURO_LABEL.texto}</Badge>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-neutral-500">Pendências:</span>
        <Badge variant={pendencias > 0 ? 'warning' : 'success'}>{pendencias}</Badge>
      </span>
      {ultimaAtividade && (
        <span className="text-xs text-neutral-400">Última atividade: {formatDataSimples(ultimaAtividade)}</span>
      )}
      <span className="ml-auto flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
        <ArrowRight className="h-4 w-4" aria-hidden />
        {resumo.proximaAcao}
      </span>
    </div>
  );
}
