import { useMemo } from 'react';
import { useArquivos } from '@/shared/capabilities/hooks/useArquivos';
import { useComentarios } from '@/shared/capabilities/hooks/useComentarios';
import { useTags } from '@/shared/capabilities/hooks/useTags';
import { useTimeline } from '@/shared/capabilities/hooks/useTimeline';
import { diasDesde, diasAte } from '@/shared/lib/format';
// Leitura cross-feature (DEC-039/DEC-048): Contratos alimenta a categoria comercial (dado já
// existia desde a Sprint 7, só não estava conectado ao Health Score do Motorista — DEC-047);
// Financeiro alimenta a categoria financeira.
//
// Achado da auditoria da Missão 5 (Fase 1, performance, DEC-108): as 4 chamadas de
// contratos/lançamentos/pagamentos abaixo eram o pior caso da plataforma — buscavam a empresa
// INTEIRA (todo o histórico de lançamentos E pagamentos, qualquer status) só pra filtrar por
// `motorista.id` em memória. Agora filtram server-side. `useMotoristas()`/`useVeiculos()`
// continuam sem filtro — `comparativos` precisa do grupo inteiro, e `veiculoDoMotorista`
// resolve contra a frota já carregada por outra tela na mesma navegação (React Query dedupe).
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { useLancamentos } from '@/features/financeiro/hooks/useLancamentos';
import { usePagamentosPendentesPorEmpresa, usePagamentosPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
import { calcularHealthScore } from '../intelligence/healthScore';
import { gerarInsights } from '../intelligence/insights';
import { gerarAlertas } from '../intelligence/alerts';
import { gerarProximasAcoes } from '../intelligence/nextActions';
import { gerarComparativos } from '../intelligence/comparatives';
import { calcularDriverScore, calcularNivelPrimeDriver, type DriverScoreResult, type NivelPrimeDriver } from '../intelligence/driverScore';
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
      driverScore: DriverScoreResult;
      nivelPrimeDriver: NivelPrimeDriver;
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
  const { data: contratos, isLoading: loadingContratos } = useContratos({ motoristaId });
  const { data: veiculos, isLoading: loadingVeiculos } = useVeiculos();
  const { data: lancamentos, isLoading: loadingLancamentos } = useLancamentos({ motoristaId });
  const { data: pagamentosPendentes, isLoading: loadingPagamentos } = usePagamentosPendentesPorEmpresa({ motoristaId });
  const { data: pagamentosTodos, isLoading: loadingPagamentosTodos } = usePagamentosPorEmpresa({ motoristaId });

  const isLoading =
    loadingDocumentos ||
    loadingComentarios ||
    loadingTags ||
    loadingEventos ||
    loadingGrupo ||
    loadingContratos ||
    loadingVeiculos ||
    loadingLancamentos ||
    loadingPagamentos ||
    loadingPagamentosTodos;

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

    // Veículo do contrato ativo (ou, na ausência, do contrato mais recente) alimenta a Saúde
    // Patrimonial — mesmo dado que a Saúde Comercial já usa, achado da auditoria da Missão 2
    // (2026-08-06): antes, esta categoria nunca tinha sido conectada mesmo com o dado disponível.
    const contratoDeReferencia =
      contratosDoMotorista.find((c) => c.status === 'ativo') ??
      [...contratosDoMotorista].sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0];
    const veiculoDoMotorista = contratoDeReferencia
      ? (veiculos ?? []).find((v) => v.id === contratoDeReferencia.veiculo_id) ?? null
      : null;

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
      saudePatrimonial: { veiculo: veiculoDoMotorista },
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

    // Driver Score / Prime Driver (Missão 3) — implementa PRIME_DRIVER_PROGRAM.md seções 3/4.
    // "Tempo contínuo no status atual" usa o evento de status mais recente na Timeline como
    // proxy do início do ciclo atual — timeline_eventos não guarda "para qual status" de
    // forma estruturada (só na descrição em texto), limitação registrada em DEC desta missão.
    const eventosDeStatus = (eventos ?? []).filter((e) => e.tipo === 'status_alterado');
    const diasNoStatusAtual = eventosDeStatus.length > 0 ? diasDesde(eventosDeStatus[0].criado_em) : diasComoCliente;

    const pagamentosDoMotorista = (pagamentosTodos ?? []).filter((p) => p.lancamento?.motorista_id === motorista.id);
    const pagamentosPagos = pagamentosDoMotorista.filter((p) => p.status === 'pago');
    const pagamentosPagosNoPrazo = pagamentosPagos.filter(
      (p) => !p.data_pagamento || p.data_pagamento <= p.data_prevista
    );
    const pagamentosPendentesDoMotorista = pagamentosDoMotorista.filter((p) => p.status === 'pendente');
    const hoje = new Date().toISOString().slice(0, 10);
    const semPagamentoEmAtraso = !pagamentosPendentesDoMotorista.some((p) => p.data_prevista < hoje);

    const driverScore = calcularDriverScore({
      motorista,
      healthScore,
      diasNoStatusAtual,
      contratos: {
        total: contratosDoMotorista.length,
        encerradosNormalmente: contratosDoMotorista.filter((c) => c.status === 'encerrado').length,
        cancelados: contratosDoMotorista.filter((c) => c.status === 'cancelado').length,
      },
      pagamentos: { total: pagamentosDoMotorista.length, pagos: pagamentosPagos.length, pagosNoPrazo: pagamentosPagosNoPrazo.length },
    });

    const categoriaDocumental = healthScore.categorias.find((c) => c.categoria === 'documental');
    const categoriaOperacional = healthScore.categorias.find((c) => c.categoria === 'operacional');
    const nivelPrimeDriver = calcularNivelPrimeDriver({
      motoristaAtivo: motorista.status === 'ativo',
      documentacaoEmDia: categoriaDocumental?.status === 'ok',
      diasContinuosAtivo: motorista.status === 'ativo' ? diasNoStatusAtual : null,
      semAlertaCriticoOperacionalOuDocumental: categoriaDocumental?.status !== 'critico' && categoriaOperacional?.status !== 'critico',
      semContratoCancelado: contratosDoMotorista.every((c) => c.status !== 'cancelado'),
      semPagamentoEmAtraso,
    });

    return {
      isLoading: false as const,
      healthScore,
      insights,
      alertas,
      proximasAcoes,
      comparativos,
      driverScore,
      nivelPrimeDriver,
    };
  }, [motorista, isLoading, documentos, comentarios, tags, eventos, grupo, contratos, veiculos, lancamentos, pagamentosPendentes, pagamentosTodos]);
}
