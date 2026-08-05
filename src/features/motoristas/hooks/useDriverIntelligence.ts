import { useMemo } from 'react';
import { useArquivos } from '@/shared/capabilities/hooks/useArquivos';
import { useComentarios } from '@/shared/capabilities/hooks/useComentarios';
import { useTags } from '@/shared/capabilities/hooks/useTags';
import { useTimeline } from '@/shared/capabilities/hooks/useTimeline';
import { diasDesde, diasAte } from '@/shared/lib/format';
// Leitura cross-feature (DEC-039/DEC-048): Contratos alimenta a categoria comercial (dado já
// existia desde a Sprint 7, só não estava conectado ao Health Score do Motorista — DEC-047);
// Financeiro alimenta a categoria financeira.
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { useLancamentosPorEmpresa } from '@/features/financeiro/hooks/useLancamentos';
import { usePagamentosPendentesPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
import { calcularHealthScore } from '../intelligence/healthScore';
import { gerarInsights } from '../intelligence/insights';
import { gerarAlertas } from '../intelligence/alerts';
import { gerarProximasAcoes } from '../intelligence/nextActions';
import { gerarComparativos } from '../intelligence/comparatives';
import { useMotoristas } from './useMotoristas';
import type { Motorista } from '../types';
import type { Alerta, ComparativoResult, HealthScoreResult, Insight, NextAction } from '../intelligence/types';

export type UseDriverIntelligenceResult =
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
// puras, sem nenhuma dependência de UI ou de rede) — mesmo papel de useVehicleIntelligence
// no módulo Veículos. Único lugar do módulo Motoristas que conhece as duas pontas.
export function useDriverIntelligence(motorista: Motorista | undefined): UseDriverIntelligenceResult {
  const motoristaId = motorista?.id ?? '';

  const { data: documentos, isLoading: loadingDocumentos } = useArquivos('motorista', motoristaId, 'documento');
  const { data: comentarios, isLoading: loadingComentarios } = useComentarios('motorista', motoristaId);
  const { data: tags, isLoading: loadingTags } = useTags('motorista', motoristaId);
  const { data: eventos, isLoading: loadingEventos } = useTimeline('motorista', motoristaId);
  const { data: grupo, isLoading: loadingGrupo } = useMotoristas();
  const { data: contratos, isLoading: loadingContratos } = useContratos();
  const { data: lancamentos, isLoading: loadingLancamentos } = useLancamentosPorEmpresa();
  const { data: pagamentosPendentes, isLoading: loadingPagamentos } = usePagamentosPendentesPorEmpresa();

  const isLoading =
    loadingDocumentos ||
    loadingComentarios ||
    loadingTags ||
    loadingEventos ||
    loadingGrupo ||
    loadingContratos ||
    loadingLancamentos ||
    loadingPagamentos;

  return useMemo(() => {
    if (!motorista || isLoading) return { isLoading: true as const };

    const totalDocumentos = documentos?.length ?? 0;
    const totalComentarios = comentarios?.length ?? 0;
    const totalTags = tags?.length ?? 0;
    const diasDesdeUltimoEvento = eventos && eventos.length > 0 ? diasDesde(eventos[0].criado_em) : null;
    const diasComoCliente = diasDesde(motorista.criado_em);
    const diasAteVencimentoCnh = diasAte(motorista.cnh_validade);

    const contratosDoMotorista = (contratos ?? []).filter((c) => c.motorista_id === motorista.id);
    const saudeComercial = {
      totalContratos: contratosDoMotorista.length,
      contratosAtivos: contratosDoMotorista.filter((c) => c.status === 'ativo').length,
      contratosCancelados: contratosDoMotorista.filter((c) => c.status === 'cancelado').length,
    };

    const saudeFinanceira = {
      temAlgumLancamentoVinculado: (lancamentos ?? []).some((l) => l.motorista_id === motorista.id),
      pagamentosPendentes: (pagamentosPendentes ?? [])
        .filter((p) => p.lancamento?.motorista_id === motorista.id)
        .map((p) => ({ data_prevista: p.data_prevista })),
    };

    const healthScore = calcularHealthScore({
      motorista,
      totalDocumentos,
      diasAteVencimentoCnh,
      diasDesdeUltimoEvento,
      saudeFinanceira,
      saudeComercial,
    });

    const insights = gerarInsights({ diasComoCliente, diasAteVencimentoCnh, totalComentarios, totalTags });

    const alertas = gerarAlertas({ motorista, totalDocumentos, diasAteVencimentoCnh, diasDesdeUltimoEvento });

    const proximasAcoes = gerarProximasAcoes({
      totalDocumentos,
      totalTags,
      cnhValidadeCadastrada: !!motorista.cnh_validade,
    });

    const grupoLista = grupo ?? [];
    const comparativos = gerarComparativos({
      motoristaId: motorista.id,
      diasComoCliente,
      grupoComDiasComoCliente: grupoLista.map((m) => ({ id: m.id, dias: diasDesde(m.criado_em) })),
    });

    return {
      isLoading: false as const,
      healthScore,
      insights,
      alertas,
      proximasAcoes,
      comparativos,
    };
  }, [motorista, isLoading, documentos, comentarios, tags, eventos, grupo, contratos, lancamentos, pagamentosPendentes]);
}
