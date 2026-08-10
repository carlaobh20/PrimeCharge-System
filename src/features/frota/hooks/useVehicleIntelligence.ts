import { useMemo } from 'react';
import { useArquivos } from '@/shared/capabilities/hooks/useArquivos';
import { useComentarios } from '@/shared/capabilities/hooks/useComentarios';
import { useTags } from '@/shared/capabilities/hooks/useTags';
import { useTimeline } from '@/shared/capabilities/hooks/useTimeline';
// Leitura cross-feature de hooks de listagem do Financeiro — DEC-048 (extensão de DEC-039)
// para alimentar a categoria financeira do Health Score com dado real. `useContratos()` entra
// pelo mesmo motivo (fecha o `score: null` hardcoded da categoria Comercial — ver
// DECISION_LOG.md, auditoria de CTO 2026-08-06).
//
// Achado da auditoria da Missão 5 (Fase 1, performance): as três chamadas abaixo buscavam a
// empresa INTEIRA (todos os lançamentos, todos os pagamentos pendentes, todos os contratos) só
// para filtrar por `veiculo.id` em memória logo em seguida — a cada mil veículos com anos de
// histórico financeiro, isso vira o gargalo #1 de toda a plataforma (DEC-108). Agora filtram
// server-side, mesmo suporte que `useLancamentos({veiculoId})` já tinha desde a Missão 4.
//
// Épico 5 — "Fleet Intelligence 360": `useVeiculos()` (buscava a frota inteira só pra
// `gerarComparativos` calcular km/dias/valor médio) foi removido daqui — auditoria encontrou
// que isso duplicava o Comparativo de Veículos dedicado (aba própria, mais completo). A
// comparação com a frota agora vive só lá (ver VerComparativoCTA.tsx). Menos uma consulta da
// empresa inteira disparada toda vez que o Cockpit de QUALQUER veículo abre — o mesmo tipo de
// gargalo que a DEC-108 já tinha corrigido pros outros três, fechado agora pro último caso.
import { useLancamentos } from '@/features/financeiro/hooks/useLancamentos';
import { usePagamentosPendentesPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { calcularHealthScore } from '../intelligence/healthScore';
import { gerarInsights } from '../intelligence/insights';
import { gerarAlertas } from '../intelligence/alerts';
import { gerarProximasAcoes } from '../intelligence/nextActions';
import { diasDesde } from '../lib/format';
import type { VeiculoComRelacoes } from '../types';
import type { Alerta, HealthScoreResult, Insight, NextAction } from '../intelligence/types';

export type UseVehicleIntelligenceResult =
  | { isLoading: true }
  | {
      isLoading: false;
      healthScore: HealthScoreResult;
      insights: Insight[];
      alertas: Alerta[];
      proximasAcoes: NextAction[];
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
  const { data: lancamentos, isLoading: loadingLancamentos } = useLancamentos({ veiculoId });
  const { data: pagamentosPendentes, isLoading: loadingPagamentos } = usePagamentosPendentesPorEmpresa({ veiculoId });
  const { data: contratos, isLoading: loadingContratos } = useContratos({ veiculoId });

  const isLoading =
    loadingDocumentos ||
    loadingComentarios ||
    loadingTags ||
    loadingEventos ||
    loadingLancamentos ||
    loadingPagamentos ||
    loadingContratos;

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

    const contratosDoVeiculo = (contratos ?? []).filter((c) => c.veiculo_id === veiculo.id);
    const saudeComercial = {
      totalContratos: contratosDoVeiculo.length,
      contratosAtivos: contratosDoVeiculo.filter((c) => c.status === 'ativo').length,
      contratosCancelados: contratosDoVeiculo.filter((c) => c.status === 'cancelado').length,
    };

    const healthScore = calcularHealthScore({
      veiculo,
      totalDocumentos,
      diasDesdeUltimoEvento,
      saudeFinanceira,
      saudeComercial,
    });

    const insights = gerarInsights({ veiculo, diasNaFrota, totalComentarios, totalTags });

    const alertas = gerarAlertas({ veiculo, totalDocumentos, diasDesdeUltimoEvento });

    const proximasAcoes = gerarProximasAcoes({ veiculo, totalDocumentos, totalTags });

    return {
      isLoading: false as const,
      healthScore,
      insights,
      alertas,
      proximasAcoes,
    };
  }, [veiculo, isLoading, documentos, comentarios, tags, eventos, lancamentos, pagamentosPendentes, contratos]);
}
