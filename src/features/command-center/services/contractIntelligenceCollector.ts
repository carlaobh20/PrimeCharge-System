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

// Mesmo padrão de coletarInteligenciaDaFrota/coletarInteligenciaDosMotoristas: uma rodada de
// consultas em lote pra todos os contratos (não uma por contrato), reaproveitando as mesmas
// funções puras da ficha do contrato (via features/contracts/intelligence/index.ts). Só 3
// consultas em lote aqui (sem tags — Contract Intelligence não usa totalTags em nenhuma
// regra hoje, ver useContractIntelligence.ts), não 4 como Veículo/Motorista.
export async function coletarInteligenciaDosContratos(contratos: ContratoComRelacoes[]): Promise<EntityIntelligenceSnapshot[]> {
  if (contratos.length === 0) return [];
  const ids = contratos.map((c) => c.id);

  const [documentos, eventos, comentarios] = await Promise.all([
    listArquivosPorEntidades('contrato', ids),
    listTimelinePorEntidades('contrato', ids),
    listComentariosPorEntidades('contrato', ids),
  ]);

  const documentosPorContrato = agruparPorEntidade(documentos);
  const eventosPorContrato = agruparPorEntidade(eventos);
  const comentariosPorContrato = agruparPorEntidade(comentarios);

  return contratos.map((contrato) => {
    const totalDocumentos = documentosPorContrato.get(contrato.id)?.length ?? 0;
    const eventosDoContrato = eventosPorContrato.get(contrato.id) ?? [];
    const diasDesdeUltimoEvento = eventosDoContrato.length > 0 ? diasDesde(eventosDoContrato[0].criado_em) : null;
    const totalComentarios = comentariosPorContrato.get(contrato.id)?.length ?? 0;
    const diasAteVencimento = diasAte(contrato.data_fim_prevista);
    const diasDeContratoAtivo = contrato.status === 'ativo' ? diasDesde(contrato.data_inicio) : null;

    const healthScore = calcularHealthScore({ contrato, totalDocumentos, diasAteVencimento, diasDesdeUltimoEvento });
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
