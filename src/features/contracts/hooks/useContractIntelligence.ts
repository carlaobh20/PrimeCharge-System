import { useMemo } from 'react';
import { useArquivos } from '@/shared/capabilities/hooks/useArquivos';
import { useComentarios } from '@/shared/capabilities/hooks/useComentarios';
import { useTimeline } from '@/shared/capabilities/hooks/useTimeline';
import { diasDesde, diasAte } from '@/shared/lib/format';
import { calcularHealthScore } from '../intelligence/healthScore';
import { gerarInsights } from '../intelligence/insights';
import { gerarAlertas } from '../intelligence/alerts';
import { gerarProximasAcoes } from '../intelligence/nextActions';
import { gerarOportunidades } from '../intelligence/opportunities';
import { gerarComparativos } from '../intelligence/comparatives';
import { useContratos } from './useContratos';
import type { ContratoComRelacoes } from '../types';
import type { Alerta, ComparativoResult, HealthScoreResult, Insight, NextAction, Opportunity } from '../intelligence/types';

export type UseContractIntelligenceResult =
  | { isLoading: true }
  | {
      isLoading: false;
      healthScore: HealthScoreResult;
      insights: Insight[];
      alertas: Alerta[];
      proximasAcoes: NextAction[];
      oportunidades: Opportunity[];
      comparativos: ComparativoResult;
    };

// Ponte entre os hooks de dado (React Query + Supabase) e a camada intelligence/ (funções
// puras) — mesmo papel de useVehicleIntelligence e useDriverIntelligence. Único lugar do
// módulo Contratos que conhece as duas pontas.
export function useContractIntelligence(contrato: ContratoComRelacoes | undefined): UseContractIntelligenceResult {
  const contratoId = contrato?.id ?? '';

  const { data: documentos, isLoading: loadingDocumentos } = useArquivos('contrato', contratoId, 'documento');
  const { data: comentarios, isLoading: loadingComentarios } = useComentarios('contrato', contratoId);
  const { data: eventos, isLoading: loadingEventos } = useTimeline('contrato', contratoId);
  const { data: grupo, isLoading: loadingGrupo } = useContratos();

  const isLoading = loadingDocumentos || loadingComentarios || loadingEventos || loadingGrupo;

  return useMemo(() => {
    if (!contrato || isLoading) return { isLoading: true as const };

    const totalDocumentos = documentos?.length ?? 0;
    const totalComentarios = comentarios?.length ?? 0;
    const diasDesdeUltimoEvento = eventos && eventos.length > 0 ? diasDesde(eventos[0].criado_em) : null;
    const diasAteVencimento = diasAte(contrato.data_fim_prevista);
    const diasDeContratoAtivo = contrato.status === 'ativo' ? diasDesde(contrato.data_inicio) : null;

    const healthScore = calcularHealthScore({
      contrato,
      totalDocumentos,
      diasAteVencimento,
      diasDesdeUltimoEvento,
    });

    const alertas = gerarAlertas({ contrato, totalDocumentos, diasAteVencimento, diasDesdeUltimoEvento });

    const insights = gerarInsights({
      status: contrato.status,
      diasDeContratoAtivo,
      valorPeriodico: contrato.valor_periodico,
      periodicidade: contrato.periodicidade,
      totalComentarios,
    });

    const proximasAcoes = gerarProximasAcoes({ status: contrato.status, totalDocumentos, diasAteVencimento });

    const oportunidades = gerarOportunidades({
      status: contrato.status,
      diasAteVencimento,
      motoristaStatus: contrato.motorista?.status ?? '',
    });

    const grupoLista = grupo ?? [];
    const comparativos = gerarComparativos({
      contratoId: contrato.id,
      valorPeriodico: contrato.valor_periodico,
      grupoComValor: grupoLista
        .filter((c) => c.periodicidade === contrato.periodicidade)
        .map((c) => ({ id: c.id, valor: c.valor_periodico })),
    });

    return {
      isLoading: false as const,
      healthScore,
      insights,
      alertas,
      proximasAcoes,
      oportunidades,
      comparativos,
    };
  }, [contrato, isLoading, documentos, comentarios, eventos, grupo]);
}
