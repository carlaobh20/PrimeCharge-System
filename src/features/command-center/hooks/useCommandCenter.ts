import { useQuery } from '@tanstack/react-query';
import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { useMotoristas } from '@/features/motoristas/hooks/useMotoristas';
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { useLancamentosPorEmpresa } from '@/features/financeiro/hooks/useLancamentos';
import { usePagamentosPendentesPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
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
  // Lançamentos/Pagamentos buscados UMA vez aqui e repassados aos três coletores — antes,
  // cada coletor (fleet/driver/contract) buscava a própria cópia (3x lançamentos, 3x
  // pagamentos, 2x contratos numa única carga da Home). Achado da auditoria de CTO
  // (2026-08-06, ver DECISION_LOG.md) — furava o objetivo original da DEC-024 ("sempre N
  // consultas fixas, não uma por origem") sem que ninguém tivesse decidido isso de propósito.
  const { data: lancamentos, isLoading: loadingLancamentos } = useLancamentosPorEmpresa();
  const { data: pagamentosPendentes, isLoading: loadingPagamentos } = usePagamentosPendentesPorEmpresa();

  const loadingBase = loadingFrota || loadingMotoristas || loadingContratos || loadingLancamentos || loadingPagamentos;
  const crossFeatureDeps = {
    contratos: contratos ?? [],
    lancamentos: lancamentos ?? [],
    pagamentosPendentes: pagamentosPendentes ?? [],
    veiculos: frota ?? [],
  };

  const { data: snapshotsFrota, isLoading: loadingIntelFrota } = useQuery({
    queryKey: [
      'command-center',
      'fleet-intelligence',
      (frota ?? []).map((v) => v.id).join(','),
      crossFeatureDeps.contratos.length,
      crossFeatureDeps.lancamentos.length,
      crossFeatureDeps.pagamentosPendentes.length,
    ],
    queryFn: () => coletarInteligenciaDaFrota(frota ?? [], crossFeatureDeps),
    enabled: !loadingBase,
  });

  const { data: snapshotsMotoristas, isLoading: loadingIntelMotoristas } = useQuery({
    queryKey: [
      'command-center',
      'driver-intelligence',
      (motoristas ?? []).map((m) => m.id).join(','),
      crossFeatureDeps.contratos.length,
      crossFeatureDeps.lancamentos.length,
      crossFeatureDeps.pagamentosPendentes.length,
      crossFeatureDeps.veiculos.length,
    ],
    queryFn: () => coletarInteligenciaDosMotoristas(motoristas ?? [], crossFeatureDeps),
    enabled: !loadingBase,
  });

  const { data: snapshotsContratos, isLoading: loadingIntelContratos } = useQuery({
    queryKey: [
      'command-center',
      'contract-intelligence',
      (contratos ?? []).map((c) => c.id).join(','),
      crossFeatureDeps.lancamentos.length,
      crossFeatureDeps.pagamentosPendentes.length,
    ],
    queryFn: () => coletarInteligenciaDosContratos(contratos ?? [], crossFeatureDeps),
    enabled: !loadingBase,
  });

  const isLoading =
    loadingBase ||
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
