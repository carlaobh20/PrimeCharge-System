import { useMemo } from 'react';
import { useArquivos } from '@/shared/capabilities/hooks/useArquivos';
import { useComentarios } from '@/shared/capabilities/hooks/useComentarios';
import { useTags } from '@/shared/capabilities/hooks/useTags';
import { useTimeline } from '@/shared/capabilities/hooks/useTimeline';
import { diasDesde, diasAte } from '@/shared/lib/format';
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

  const isLoading = loadingDocumentos || loadingComentarios || loadingTags || loadingEventos || loadingGrupo;

  return useMemo(() => {
    if (!motorista || isLoading) return { isLoading: true as const };

    const totalDocumentos = documentos?.length ?? 0;
    const totalComentarios = comentarios?.length ?? 0;
    const totalTags = tags?.length ?? 0;
    const diasDesdeUltimoEvento = eventos && eventos.length > 0 ? diasDesde(eventos[0].criado_em) : null;
    const diasComoCliente = diasDesde(motorista.criado_em);
    const diasAteVencimentoCnh = diasAte(motorista.cnh_validade);

    const healthScore = calcularHealthScore({
      motorista,
      totalDocumentos,
      diasAteVencimentoCnh,
      diasDesdeUltimoEvento,
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
  }, [motorista, isLoading, documentos, comentarios, tags, eventos, grupo]);
}
