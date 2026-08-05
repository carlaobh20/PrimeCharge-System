import { listArquivosPorEntidades } from '@/shared/capabilities/api/arquivos';
import { listTimelinePorEntidades } from '@/shared/capabilities/api/timeline';
import { listComentariosPorEntidades } from '@/shared/capabilities/api/comentarios';
import { listTagsPorEntidades } from '@/shared/capabilities/api/tags';
import { diasDesde, diasAte } from '@/shared/lib/format';
import {
  calcularHealthScore,
  gerarAlertas,
  gerarInsights,
  gerarOportunidades,
  gerarProximasAcoes,
  gerarRiscos,
} from '@/features/motoristas/intelligence';
// Leitura cross-feature em lote — mesmo motivo de useDriverIntelligence (DEC-039/DEC-048),
// só que aqui para todos os motoristas de uma vez, seguindo o padrão de coleta em lote
// deste arquivo (não uma consulta por motorista).
import { listContratosPorEmpresa } from '@/features/contracts/api/contratos';
import { listLancamentosPorEmpresa } from '@/features/financeiro/api/lancamentos';
import { listPagamentosPendentesPorEmpresa } from '@/features/financeiro/api/pagamentos';
import type { Motorista } from '@/features/motoristas/types';
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

// Motoristas nunca alimentaram o Command Center, apesar de Driver Intelligence existir desde
// a Sprint 6 — gap identificado e fechado como parte da Sprint 7 (Contratos), já que o
// Command Center passa a ser genérico mesmo (ver EntityIntelligenceSnapshot). Mesmo padrão de
// coletarInteligenciaDaFrota: uma rodada de consultas em lote pra todos os motoristas, não
// uma consulta por motorista, e as mesmas funções puras da ficha do motorista (via o barril
// features/motoristas/intelligence/index.ts). Sprint 8 (DEC-047/DEC-048) soma Contratos e
// Financeiro em lote às 4 consultas já existentes.
export async function coletarInteligenciaDosMotoristas(motoristas: Motorista[]): Promise<EntityIntelligenceSnapshot[]> {
  if (motoristas.length === 0) return [];
  const ids = motoristas.map((m) => m.id);

  const [documentos, eventos, comentarios, tags, contratos, lancamentos, pagamentosPendentes] = await Promise.all([
    listArquivosPorEntidades('motorista', ids),
    listTimelinePorEntidades('motorista', ids),
    listComentariosPorEntidades('motorista', ids),
    listTagsPorEntidades('motorista', ids),
    listContratosPorEmpresa(),
    listLancamentosPorEmpresa(),
    listPagamentosPendentesPorEmpresa(),
  ]);

  const documentosPorMotorista = agruparPorEntidade(documentos);
  const eventosPorMotorista = agruparPorEntidade(eventos);
  const comentariosPorMotorista = agruparPorEntidade(comentarios);
  const tagsPorMotorista = agruparPorEntidade(tags);
  const contratosPorMotorista = agruparPorId(contratos, (c) => c.motorista_id);
  const lancamentosPorMotorista = agruparPorId(lancamentos, (l) => l.motorista_id);
  const pagamentosPorMotorista = agruparPorId(pagamentosPendentes, (p) => p.lancamento?.motorista_id);

  return motoristas.map((motorista) => {
    const totalDocumentos = documentosPorMotorista.get(motorista.id)?.length ?? 0;
    const eventosDoMotorista = eventosPorMotorista.get(motorista.id) ?? [];
    const diasDesdeUltimoEvento = eventosDoMotorista.length > 0 ? diasDesde(eventosDoMotorista[0].criado_em) : null;
    const totalComentarios = comentariosPorMotorista.get(motorista.id)?.length ?? 0;
    const totalTags = tagsPorMotorista.get(motorista.id)?.length ?? 0;
    const diasComoCliente = diasDesde(motorista.criado_em);
    const diasAteVencimentoCnh = diasAte(motorista.cnh_validade);

    const contratosDoMotorista = contratosPorMotorista.get(motorista.id) ?? [];
    const saudeComercial = {
      totalContratos: contratosDoMotorista.length,
      contratosAtivos: contratosDoMotorista.filter((c) => c.status === 'ativo').length,
      contratosCancelados: contratosDoMotorista.filter((c) => c.status === 'cancelado').length,
    };

    const saudeFinanceira = {
      temAlgumLancamentoVinculado: (lancamentosPorMotorista.get(motorista.id)?.length ?? 0) > 0,
      pagamentosPendentes: (pagamentosPorMotorista.get(motorista.id) ?? []).map((p) => ({ data_prevista: p.data_prevista })),
    };

    const healthScore = calcularHealthScore({
      motorista,
      totalDocumentos,
      diasAteVencimentoCnh,
      diasDesdeUltimoEvento,
      saudeFinanceira,
      saudeComercial,
    });
    const alertas = gerarAlertas({ motorista, totalDocumentos, diasAteVencimentoCnh, diasDesdeUltimoEvento });

    return {
      origemTipo: 'motorista' as const,
      origemId: motorista.id,
      origemLabel: motorista.nome_completo,
      hrefBase: `/motoristas/${motorista.id}`,
      healthScore,
      alertas,
      insights: gerarInsights({ diasComoCliente, diasAteVencimentoCnh, totalComentarios, totalTags }),
      proximasAcoes: gerarProximasAcoes({ totalDocumentos, totalTags, cnhValidadeCadastrada: !!motorista.cnh_validade }),
      oportunidades: gerarOportunidades({ motorista, totalDocumentos, diasAteVencimentoCnh }),
      riscos: gerarRiscos({ alertas, healthScore }),
    };
  });
}
