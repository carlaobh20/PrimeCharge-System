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
import type { Motorista } from '@/features/motoristas/types';
import type { DadosCrossFeatureCompartilhados, EntityIntelligenceSnapshot } from '../types';

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
// features/motoristas/intelligence/index.ts).
//
// Contratos/Lançamentos/Pagamentos vêm por parâmetro (`deps`), não são mais buscados aqui —
// auditoria de CTO (2026-08-06) encontrou os três coletores buscando a mesma lista cada um
// por conta própria; useCommandCenter busca uma vez só e repassa (ver types.ts).
export async function coletarInteligenciaDosMotoristas(
  motoristas: Motorista[],
  deps: DadosCrossFeatureCompartilhados
): Promise<EntityIntelligenceSnapshot[]> {
  if (motoristas.length === 0) return [];
  const ids = motoristas.map((m) => m.id);

  const [documentos, eventos, comentarios, tags] = await Promise.all([
    listArquivosPorEntidades('motorista', ids),
    listTimelinePorEntidades('motorista', ids),
    listComentariosPorEntidades('motorista', ids),
    listTagsPorEntidades('motorista', ids),
  ]);

  const documentosPorMotorista = agruparPorEntidade(documentos);
  const eventosPorMotorista = agruparPorEntidade(eventos);
  const comentariosPorMotorista = agruparPorEntidade(comentarios);
  const tagsPorMotorista = agruparPorEntidade(tags);
  const contratosPorMotorista = agruparPorId(deps.contratos, (c) => c.motorista_id);
  const lancamentosPorMotorista = agruparPorId(deps.lancamentos, (l) => l.motorista_id);
  const pagamentosPorMotorista = agruparPorId(deps.pagamentosPendentes, (p) => p.lancamento?.motorista_id);
  const veiculosPorId = new Map(deps.veiculos.map((v) => [v.id, v]));

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

    const contratoDeReferencia =
      contratosDoMotorista.find((c) => c.status === 'ativo') ??
      [...contratosDoMotorista].sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0];
    const veiculoDoMotorista = contratoDeReferencia ? veiculosPorId.get(contratoDeReferencia.veiculo_id) ?? null : null;

    const healthScore = calcularHealthScore({
      motorista,
      totalDocumentos,
      diasAteVencimentoCnh,
      diasDesdeUltimoEvento,
      saudeFinanceira,
      saudeComercial,
      saudePatrimonial: { veiculo: veiculoDoMotorista },
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
