import { listArquivosPorEntidades } from '@/shared/capabilities/api/arquivos';
import { listTimelinePorEntidades } from '@/shared/capabilities/api/timeline';
import { listComentariosPorEntidades } from '@/shared/capabilities/api/comentarios';
import { diasDesde, diasAte } from '@/shared/lib/format';
import {
  calcularHealthScore,
  gerarAlertas,
  gerarInsights,
  gerarOportunidades,
  gerarProximasAcoes,
  gerarRiscos,
} from '@/features/contracts/intelligence';
// Leitura cross-feature em lote do Financeiro — mesmo motivo de useContractIntelligence
// (DEC-048), aqui em lote pra todos os contratos, não uma consulta por contrato.
import { listLancamentosPorEmpresa } from '@/features/financeiro/api/lancamentos';
import { listPagamentosPendentesPorEmpresa } from '@/features/financeiro/api/pagamentos';
import type { ContratoComRelacoes } from '@/features/contracts/types';
import type { EntityIntelligenceSnapshot } from '../types';

function agruparPorEntidade<T extends { entidade_id: string }>(itens: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    const lista = mapa.get(item.entidade_id);
    if (lista) lista.push(item);
    else mapa.set(item.entidade_id, [item]);
  }
  return mapa;
}

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

// Mesmo padrão de coletarInteligenciaDaFrota/coletarInteligenciaDosMotoristas: uma rodada de
// consultas em lote pra todos os contratos (não uma por contrato), reaproveitando as mesmas
// funções puras da ficha do contrato (via features/contracts/intelligence/index.ts). Sem tags
// (Contract Intelligence não usa totalTags em nenhuma regra hoje, ver
// useContractIntelligence.ts). Sprint 8 (DEC-047/DEC-048) soma Financeiro em lote.
export async function coletarInteligenciaDosContratos(contratos: ContratoComRelacoes[]): Promise<EntityIntelligenceSnapshot[]> {
  if (contratos.length === 0) return [];
  const ids = contratos.map((c) => c.id);

  const [documentos, eventos, comentarios, lancamentos, pagamentosPendentes] = await Promise.all([
    listArquivosPorEntidades('contrato', ids),
    listTimelinePorEntidades('contrato', ids),
    listComentariosPorEntidades('contrato', ids),
    listLancamentosPorEmpresa(),
    listPagamentosPendentesPorEmpresa(),
  ]);

  const documentosPorContrato = agruparPorEntidade(documentos);
  const eventosPorContrato = agruparPorEntidade(eventos);
  const comentariosPorContrato = agruparPorEntidade(comentarios);
  const lancamentosPorContrato = agruparPorId(lancamentos, (l) => l.contrato_id);
  const pagamentosPorContrato = agruparPorId(pagamentosPendentes, (p) => p.lancamento?.contrato_id);

  return contratos.map((contrato) => {
    const totalDocumentos = documentosPorContrato.get(contrato.id)?.length ?? 0;
    const eventosDoContrato = eventosPorContrato.get(contrato.id) ?? [];
    const diasDesdeUltimoEvento = eventosDoContrato.length > 0 ? diasDesde(eventosDoContrato[0].criado_em) : null;
    const totalComentarios = comentariosPorContrato.get(contrato.id)?.length ?? 0;
    const diasAteVencimento = diasAte(contrato.data_fim_prevista);
    const diasDeContratoAtivo = contrato.status === 'ativo' ? diasDesde(contrato.data_inicio) : null;

    const saudeFinanceira = {
      temAlgumLancamentoVinculado: (lancamentosPorContrato.get(contrato.id)?.length ?? 0) > 0,
      pagamentosPendentes: (pagamentosPorContrato.get(contrato.id) ?? []).map((p) => ({ data_prevista: p.data_prevista })),
    };

    const healthScore = calcularHealthScore({ contrato, totalDocumentos, diasAteVencimento, diasDesdeUltimoEvento, saudeFinanceira });
    const alertas = gerarAlertas({ contrato, totalDocumentos, diasAteVencimento, diasDesdeUltimoEvento });

    return {
      origemTipo: 'contrato' as const,
      origemId: contrato.id,
      origemLabel: contrato.veiculo?.placa ?? contrato.motorista?.nome_completo ?? contrato.id,
      hrefBase: `/contratos/${contrato.id}`,
      healthScore,
      alertas,
      insights: gerarInsights({
        status: contrato.status,
        diasDeContratoAtivo,
        valorPeriodico: contrato.valor_periodico,
        periodicidade: contrato.periodicidade,
        totalComentarios,
      }),
      proximasAcoes: gerarProximasAcoes({ status: contrato.status, totalDocumentos, diasAteVencimento }),
      oportunidades: gerarOportunidades({
        status: contrato.status,
        diasAteVencimento,
        motoristaStatus: contrato.motorista?.status ?? '',
      }),
      riscos: gerarRiscos({ alertas, healthScore }),
    };
  });
}
