import { useQuery } from '@tanstack/react-query';
import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { useMotoristas } from '@/features/motoristas/hooks/useMotoristas';
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { coletarInteligenciaDaFrota, paraSnapshotGenerico } from '../services/fleetIntelligenceCollector';
import { coletarInteligenciaDosMotoristas } from '../services/driverIntelligenceCollector';
import { coletarInteligenciaDosContratos } from '../services/contractIntelligenceCollector';
import { consolidarAlertas } from '../engine/alertEngine';
import { consolidarInsights } from '../engine/insightEngine';
import { consolidarAcoes } from '../engine/actionEngine';
import { consolidarOportunidades } from '../engine/opportunityEngine';
import { consolidarRiscos } from '../engine/riskEngine';
import { calcularResumoDaFrota } from '../engine/fleetHealthEngine';
import { selecionarPrioridadesDoDia } from '../engine/priorityEngine';
import type { CommandCenterFeedItem, EntityIntelligenceSnapshot } from '../types';

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
//
// Sprint 7 (Contratos, ver DEC-038): os cinco engines de priorização (Alert/Insight/Action/
// Opportunity/Risk) agora recebem entidades de três origens — Veículos, Motoristas e
// Contratos — misturadas num só array genérico (EntityIntelligenceSnapshot). Motoristas
// nunca tinha sido conectado ao Command Center apesar de Driver Intelligence existir desde a
// Sprint 6; esse gap pré-existente foi fechado junto, no mesmo espírito de generalizar os
// engines em vez de criar um "engine de Contrato" paralelo. `resumoFrota` ("resumo da
// frota") continua exclusivamente sobre Veículos — não fazia parte do pedido desta sprint e
// mistura mal com Motorista/Contrato (é sobre estado físico de ativo).
export function useCommandCenter(): UseCommandCenterResult {
  const { data: frota, isLoading: loadingFrota } = useVeiculos();
  const { data: motoristas, isLoading: loadingMotoristas } = useMotoristas();
  const { data: contratos, isLoading: loadingContratos } = useContratos();

  const { data: snapshotsFrota, isLoading: loadingIntelFrota } = useQuery({
    queryKey: ['command-center', 'fleet-intelligence', (frota ?? []).map((v) => v.id).join(',')],
    queryFn: () => coletarInteligenciaDaFrota(frota ?? []),
    enabled: !loadingFrota,
  });

  const { data: snapshotsMotoristas, isLoading: loadingIntelMotoristas } = useQuery({
    queryKey: ['command-center', 'driver-intelligence', (motoristas ?? []).map((m) => m.id).join(',')],
    queryFn: () => coletarInteligenciaDosMotoristas(motoristas ?? []),
    enabled: !loadingMotoristas,
  });

  const { data: snapshotsContratos, isLoading: loadingIntelContratos } = useQuery({
    queryKey: ['command-center', 'contract-intelligence', (contratos ?? []).map((c) => c.id).join(',')],
    queryFn: () => coletarInteligenciaDosContratos(contratos ?? []),
    enabled: !loadingContratos,
  });

  const isLoading =
    loadingFrota ||
    loadingMotoristas ||
    loadingContratos ||
    loadingIntelFrota ||
    loadingIntelMotoristas ||
    loadingIntelContratos ||
    !snapshotsFrota ||
    !snapshotsMotoristas ||
    !snapshotsContratos;

  if (isLoading) {
    return { isLoading: true };
  }

  const entidades: EntityIntelligenceSnapshot[] = [
    ...paraSnapshotGenerico(snapshotsFrota),
    ...snapshotsMotoristas,
    ...snapshotsContratos,
  ];

  const alertas = consolidarAlertas(entidades);
  const insights = consolidarInsights(entidades);
  const acoes = consolidarAcoes(entidades);
  const oportunidades = consolidarOportunidades(entidades);
  const riscos = consolidarRiscos(entidades);
  const resumoFrota = calcularResumoDaFrota(snapshotsFrota);

  const feed: CommandCenterFeedItem[] = [
    ...alertas.map((a) => ({ ...a, tipo: 'alerta' as const })),
    ...riscos.map((r) => ({ ...r, tipo: 'risco' as const })),
    ...oportunidades.map((o) => ({ ...o, tipo: 'oportunidade' as const })),
    ...acoes.map((a) => ({ ...a, tipo: 'acao' as const })),
  ];
  const prioridadesDoDia = selecionarPrioridadesDoDia(feed);

  return { isLoading: false, alertas, insights, acoes, oportunidades, riscos, resumoFrota, prioridadesDoDia };
}
