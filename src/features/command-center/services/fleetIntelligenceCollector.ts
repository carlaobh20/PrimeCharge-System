import { listArquivosPorEntidades } from '@/shared/capabilities/api/arquivos';
import { listTimelinePorEntidades } from '@/shared/capabilities/api/timeline';
import { listComentariosPorEntidades } from '@/shared/capabilities/api/comentarios';
import { listTagsPorEntidades } from '@/shared/capabilities/api/tags';
import { diasDesde } from '@/shared/lib/format';
import {
  calcularHealthScore,
  gerarAlertas,
  gerarInsights,
  gerarOportunidades,
  gerarProximasAcoes,
  gerarRiscos,
} from '@/features/frota/intelligence';
import type { VeiculoComRelacoes } from '@/features/frota/types';
import type { Alerta, HealthScoreResult, Insight, NextAction, Opportunity, Risk } from '@/shared/intelligence/types';
import type { DadosCrossFeatureCompartilhados, EntityIntelligenceSnapshot } from '../types';

function agruparPorId<T>(itens: T[], getId: (item: T) => string | null | undefined): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    const id = getId(item);
    if (!id) continue;
    const lista = mapa.get(id);
    if (lista) lista.push(item);
    else mapa.set(id, [item]);
  }
  return mapa;
}

export type VeiculoIntelligenceSnapshot = {
  veiculo: VeiculoComRelacoes;
  healthScore: HealthScoreResult;
  insights: Insight[];
  alertas: Alerta[];
  proximasAcoes: NextAction[];
  oportunidades: Opportunity[];
  riscos: Risk[];
};

function agruparPorEntidade<T extends { entidade_id: string }>(itens: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    const lista = mapa.get(item.entidade_id);
    if (lista) lista.push(item);
    else mapa.set(item.entidade_id, [item]);
  }
  return mapa;
}

// Busca, em uma única rodada de consultas (não uma rodada por veículo), tudo que as
// regras de Vehicle Intelligence precisam para a frota inteira — e calcula a inteligência
// de cada veículo reaproveitando exatamente as mesmas funções puras da ficha do veículo
// (features/frota/intelligence, via o barril público index.ts — ver DEC-024).
//
// Risco aceito e registrado em DEC-024: o volume de dado por consulta cresce com o
// tamanho da frota (ainda que o número de consultas continue fixo). Para o tamanho de
// frota esperado nesta fase do produto isso é aceitável; se a Home ficar lenta com frotas
// grandes, o próximo passo é paginar ou pré-calcular/cachear, não voltar a 1 consulta por
// veículo.
//
// Contratos/Lançamentos/Pagamentos NÃO são mais buscados aqui (auditoria de CTO,
// 2026-08-06): até então este arquivo, driverIntelligenceCollector.ts e
// contractIntelligenceCollector.ts buscavam cada um a própria cópia de lancamentos/
// pagamentos (3x) e contratos (2x) numa única carga da Home — o objetivo original da
// DEC-024 ("sempre N consultas fixas") furou sem ninguém decidir isso de propósito.
// useCommandCenter agora busca essas três listas uma única vez e repassa via `deps`.
export async function coletarInteligenciaDaFrota(
  frota: VeiculoComRelacoes[],
  deps: DadosCrossFeatureCompartilhados
): Promise<VeiculoIntelligenceSnapshot[]> {
  if (frota.length === 0) return [];
  const ids = frota.map((v) => v.id);

  const [documentos, eventos, comentarios, tags] = await Promise.all([
    listArquivosPorEntidades('veiculo', ids),
    listTimelinePorEntidades('veiculo', ids),
    listComentariosPorEntidades('veiculo', ids),
    listTagsPorEntidades('veiculo', ids),
  ]);

  const documentosPorVeiculo = agruparPorEntidade(documentos);
  const eventosPorVeiculo = agruparPorEntidade(eventos);
  const comentariosPorVeiculo = agruparPorEntidade(comentarios);
  const tagsPorVeiculo = agruparPorEntidade(tags);
  const lancamentosPorVeiculo = agruparPorId(deps.lancamentos, (l) => l.veiculo_id);
  const pagamentosPorVeiculo = agruparPorId(deps.pagamentosPendentes, (p) => p.lancamento?.veiculo_id);
  const contratosPorVeiculo = agruparPorId(deps.contratos, (c) => c.veiculo_id);

  return frota.map((veiculo) => {
    const totalDocumentos = documentosPorVeiculo.get(veiculo.id)?.length ?? 0;
    // A consulta em lote já vem ordenada por criado_em desc — o primeiro item de cada
    // grupo continua sendo o mais recente (subsequência de uma lista ordenada é ordenada).
    const eventosDoVeiculo = eventosPorVeiculo.get(veiculo.id) ?? [];
    const diasDesdeUltimoEvento = eventosDoVeiculo.length > 0 ? diasDesde(eventosDoVeiculo[0].criado_em) : null;
    const totalComentarios = comentariosPorVeiculo.get(veiculo.id)?.length ?? 0;
    const totalTags = tagsPorVeiculo.get(veiculo.id)?.length ?? 0;
    const diasNaFrota = diasDesde(veiculo.data_compra ?? veiculo.criado_em);

    const saudeFinanceira = {
      temAlgumLancamentoVinculado: (lancamentosPorVeiculo.get(veiculo.id)?.length ?? 0) > 0,
      pagamentosPendentes: (pagamentosPorVeiculo.get(veiculo.id) ?? []).map((p) => ({ data_prevista: p.data_prevista })),
    };

    const contratosDoVeiculo = contratosPorVeiculo.get(veiculo.id) ?? [];
    const saudeComercial = {
      totalContratos: contratosDoVeiculo.length,
      contratosAtivos: contratosDoVeiculo.filter((c) => c.status === 'ativo').length,
      contratosCancelados: contratosDoVeiculo.filter((c) => c.status === 'cancelado').length,
    };

    const healthScore = calcularHealthScore({ veiculo, totalDocumentos, diasDesdeUltimoEvento, saudeFinanceira, saudeComercial });
    const alertas = gerarAlertas({ veiculo, totalDocumentos, diasDesdeUltimoEvento });

    return {
      veiculo,
      healthScore,
      alertas,
      insights: gerarInsights({ veiculo, diasNaFrota, totalComentarios, totalTags }),
      proximasAcoes: gerarProximasAcoes({ veiculo, totalDocumentos, totalTags }),
      oportunidades: gerarOportunidades({ veiculo }),
      riscos: gerarRiscos({ alertas, healthScore }),
    };
  });
}

// Adapta o snapshot completo (que o fleetHealthEngine — "resumo da frota", fora do escopo da
// Sprint 7 — ainda consome com o objeto `veiculo` inteiro) para o formato genérico que os
// cinco engines de priorização (Alert/Insight/Action/Opportunity/Risk) passam a consumir
// desde a Sprint 7 (ver EntityIntelligenceSnapshot em ../types). Nenhum cálculo acontece
// aqui — só reempacotamento.
export function paraSnapshotGenerico(frota: VeiculoIntelligenceSnapshot[]): EntityIntelligenceSnapshot[] {
  return frota.map((snapshot) => ({
    origemTipo: 'veiculo' as const,
    origemId: snapshot.veiculo.id,
    origemLabel: snapshot.veiculo.placa,
    hrefBase: `/veiculos/${snapshot.veiculo.id}`,
    healthScore: snapshot.healthScore,
    insights: snapshot.insights,
    alertas: snapshot.alertas,
    proximasAcoes: snapshot.proximasAcoes,
    oportunidades: snapshot.oportunidades,
    riscos: snapshot.riscos,
  }));
}
