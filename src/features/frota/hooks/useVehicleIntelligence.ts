import { useMemo } from 'react';
import { useArquivos } from '@/shared/capabilities/hooks/useArquivos';
import { useComentarios } from '@/shared/capabilities/hooks/useComentarios';
import { useTags } from '@/shared/capabilities/hooks/useTags';
import { useTimeline } from '@/shared/capabilities/hooks/useTimeline';
// Leitura cross-feature de hooks de listagem do Financeiro — DEC-048 (extensão de DEC-039)
// para alimentar a categoria financeira do Health Score com dado real.
import { useLancamentosPorEmpresa } from '@/features/financeiro/hooks/useLancamentos';
import { usePagamentosPendentesPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
import { calcularHealthScore } from '../intelligence/healthScore';
import { gerarInsights } from '../intelligence/insights';
import { gerarAlertas } from '../intelligence/alerts';
import { gerarProximasAcoes } from '../intelligence/nextActions';
import { gerarComparativos } from '../intelligence/comparatives';
import { diasDesde } from '../lib/format';
import { useVeiculos } from './useVeiculos';
import type { VeiculoComRelacoes } from '../types';
import type { Alerta, ComparativoResult, HealthScoreResult, Insight, NextAction } from '../intelligence/types';

export type UseVehicleIntelligenceResult =
  | { isLoading: true }
  | {
      isLoading: false;
      healthScore: HealthScoreResult;
      insights: Insight[];
      alertas: Alerta[];
      proximasAcoes: NextAction[];
      comparativos: ComparativoResult;
    };

// Ponte entre os hooks de dado (React Query + Supabase) e a camada intelligence/ (funções
// puras, sem nenhuma dependência de UI ou de rede). Este é o único lugar do módulo Veículos
// que conhece as duas pontas — nem a página, nem os componentes de painel, calculam nada.
export function useVehicleIntelligence(veiculo: VeiculoComRelacoes | undefined): UseVehicleIntelligenceResult {
  const veiculoId = veiculo?.id ?? '';

  const { data: documentos, isLoading: loadingDocumentos } = useArquivos('veiculo', veiculoId, 'documento');
  const { data: comentarios, isLoading: loadingComentarios } = useComentarios('veiculo', veiculoId);
  const { data: tags, isLoading: loadingTags } = useTags('veiculo', veiculoId);
  const { data: eventos, isLoading: loadingEventos } = useTimeline('veiculo', veiculoId);
  const { data: frota, isLoading: loadingFrota } = useVeiculos();
  const { data: lancamentos, isLoading: loadingLancamentos } = useLancamentosPorEmpresa();
  const { data: pagamentosPendentes, isLoading: loadingPagamentos } = usePagamentosPendentesPorEmpresa();

  const isLoading =
    loadingDocumentos || loadingComentarios || loadingTags || loadingEventos || loadingFrota || loadingLancamentos || loadingPagamentos;

  return useMemo(() => {
    if (!veiculo || isLoading) return { isLoading: true as const };

    const totalDocumentos = documentos?.length ?? 0;
    const totalComentarios = comentarios?.length ?? 0;
    const totalTags = tags?.length ?? 0;
    const diasDesdeUltimoEvento = eventos && eventos.length > 0 ? diasDesde(eventos[0].criado_em) : null;
    const diasNaFrota = diasDesde(veiculo.data_compra ?? veiculo.criado_em);

    const saudeFinanceira = {
      temAlgumLancamentoVinculado: (lancamentos ?? []).some((l) => l.veiculo_id === veiculo.id),
      pagamentosPendentes: (pagamentosPendentes ?? [])
        .filter((p) => p.lancamento?.veiculo_id === veiculo.id)
        .map((p) => ({ data_prevista: p.data_prevista })),
    };

    const healthScore = calcularHealthScore({
      veiculo,
      totalDocumentos,
      diasDesdeUltimoEvento,
      saudeFinanceira,
    });

    const insights = gerarInsights({ veiculo, diasNaFrota, totalComentarios, totalTags });

    const alertas = gerarAlertas({ veiculo, totalDocumentos, diasDesdeUltimoEvento });

    const proximasAcoes = gerarProximasAcoes({ veiculo, totalDocumentos, totalTags });

    const frotaLista = frota ?? [];
    const comparativos = gerarComparativos({
      veiculo,
      diasNaFrota,
      frota: frotaLista,
      frotaComDiasNaFrota: frotaLista.map((v) => ({ id: v.id, dias: diasDesde(v.data_compra ?? v.criado_em) })),
    });

    return {
      isLoading: false as const,
      healthScore,
      insights,
      alertas,
      proximasAcoes,
      comparativos,
    };
  }, [veiculo, isLoading, documentos, comentarios, tags, eventos, frota, lancamentos, pagamentosPendentes]);
}
