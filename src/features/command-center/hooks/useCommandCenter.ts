import { useQuery } from '@tanstack/react-query';
import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { coletarInteligenciaDaFrota } from '../services/fleetIntelligenceCollector';
import { consolidarAlertas } from '../engine/alertEngine';
import { consolidarInsights } from '../engine/insightEngine';
import { consolidarAcoes } from '../engine/actionEngine';
import { consolidarOportunidades } from '../engine/opportunityEngine';
import { consolidarRiscos } from '../engine/riskEngine';
import { calcularResumoDaFrota } from '../engine/fleetHealthEngine';
import { selecionarPrioridadesDoDia } from '../engine/priorityEngine';
import type { CommandCenterFeedItem } from '../types';

export type UseCommandCenterResult =
  | { isLoading: true }
  | {
      isLoading: false;
      alertas: ReturnType<typeof consolidarAlertas>;
      insights: ReturnType<typeof consolidarInsights>;
      acoes: ReturnType<typeof consolidarAcoes>;
      oportunidades: ReturnType<typeof consolidarOportunidades>;
      riscos: ReturnType<typeof consolidarRiscos>;
      resumoFrota: ReturnType<typeof calcularResumoDaFrota>;
      prioridadesDoDia: CommandCenterFeedItem[];
    };

// Ponte entre dado (React Query + Supabase, via services/) e os Engines (funções puras) —
// mesmo papel que useVehicleIntelligence cumpre pro Cockpit do Ativo (ver DEC-022). Nem a
// página, nem os widgets, calculam nada: só recebem o resultado já pronto.
export function useCommandCenter(): UseCommandCenterResult {
  const { data: frota, isLoading: loadingFrota } = useVeiculos();

  const { data: snapshots, isLoading: loadingIntel } = useQuery({
    queryKey: ['command-center', 'fleet-intelligence', (frota ?? []).map((v) => v.id).join(',')],
    queryFn: () => coletarInteligenciaDaFrota(frota ?? []),
    enabled: !loadingFrota,
  });

  if (loadingFrota || loadingIntel || !snapshots) {
    return { isLoading: true };
  }

  const alertas = consolidarAlertas(snapshots);
  const insights = consolidarInsights(snapshots);
  const acoes = consolidarAcoes(snapshots);
  const oportunidades = consolidarOportunidades(snapshots);
  const riscos = consolidarRiscos(snapshots);
  const resumoFrota = calcularResumoDaFrota(snapshots);

  const feed: CommandCenterFeedItem[] = [
    ...alertas.map((a) => ({ ...a, tipo: 'alerta' as const })),
    ...riscos.map((r) => ({ ...r, tipo: 'risco' as const })),
    ...oportunidades.map((o) => ({ ...o, tipo: 'oportunidade' as const })),
    ...acoes.map((a) => ({ ...a, tipo: 'acao' as const })),
  ];
  const prioridadesDoDia = selecionarPrioridadesDoDia(feed);

  return { isLoading: false, alertas, insights, acoes, oportunidades, riscos, resumoFrota, prioridadesDoDia };
}
