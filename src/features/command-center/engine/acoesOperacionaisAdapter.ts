import type { AcaoOperacional } from '@/features/operacoes/types';
import type { Impacto, Prioridade, Urgencia } from '@/shared/intelligence/types';
import type { CommandCenterFeedItem } from '../types';
import type { HealthCategoriaId } from '@/shared/intelligence/types';

// Fecha o achado #2 da auditoria de jornada da Missão 4: "Prioridades do Dia" e
// `acoes_operacionais` (a fila real e persistida de Ações Operacionais, DEC-055) eram dois
// pipelines paralelos que nunca se cruzavam — o feed do Command Center só misturava
// Alerta/Risco/Oportunidade/"Próxima Ação" (completude de cadastro), nunca a fila real de
// trabalho. Este adapter é o único lugar que traduz `AcaoOperacional` pro formato genérico
// do feed, sem duplicar a régua de prioridade (reaproveita o `prioridade` já calculado por
// cada gerador em intelligence/geradores/, nunca recalcula do zero).
const HREF_BASE: Record<string, string> = {
  veiculo: '/veiculos',
  motorista: '/motoristas',
  contrato: '/contratos',
};

// AcaoOperacional só guarda o resultado final (`prioridade`), não os dois insumos
// (impacto/urgencia) que os outros engines do Command Center calculam antes de chegar em
// PriorityMeta. Par sintético — qualquer combinação cuja matriz (priorityEngine.ts) resolva
// pra mesma prioridade final serve, porque nada além da ordenação usa esses dois campos
// depois que o item entra no feed.
const IMPACTO_URGENCIA_POR_PRIORIDADE: Record<Prioridade, { impacto: Impacto; urgencia: Urgencia }> = {
  critica: { impacto: 'alto', urgencia: 'alta' },
  alta: { impacto: 'alto', urgencia: 'media' },
  media: { impacto: 'medio', urgencia: 'media' },
  baixa: { impacto: 'baixo', urgencia: 'baixa' },
};

// `tipo` é texto livre (cresce por gerador, mesmo racional de NextAction.actionKey) — mapeia
// pra uma das 5 categorias de saúde só pra encaixar no formato do feed; "operacional" é o
// fallback seguro pra qualquer tipo novo que um gerador futuro venha a criar sem precisar
// tocar aqui.
const CATEGORIA_POR_TIPO: Record<string, HealthCategoriaId> = {
  renovacao_documento: 'documental',
  // 'documento_veiculo_vencendo' generalizado para 'documento_vencendo' na Missão 5 (Fase 4,
  // DEC-112) — o gerador passou a cobrir Motorista/Contrato, não só Veículo. Achado da Fase 9:
  // `sincronizarAcoesGeradas` casa candidata↔ação existente só por `(gerado_por, entidade_tipo,
  // entidade_id)`, nunca atualiza `tipo` de uma ação já aberta — uma ação criada antes desta
  // migration com o `tipo` antigo ficaria presa nele para sempre e cairia no fallback
  // 'operacional'. Chave antiga mantida como alias permanente (custo zero) em vez de depender
  // de uma migração de backfill que este ambiente nunca teve como testar contra dado real.
  documento_veiculo_vencendo: 'documental',
  documento_vencendo: 'documental',
  renovacao_contrato: 'comercial',
  cobranca_atrasada: 'financeira',
  cobranca_a_vencer: 'financeira',
  checklist_pendente: 'operacional',
  manutencao_agendada: 'operacional',
};

export function adaptarAcoesOperacionaisParaFeed(acoes: AcaoOperacional[]): CommandCenterFeedItem[] {
  return acoes
    .filter((a) => a.status === 'pendente' || a.status === 'em_andamento')
    .map((a) => {
      const { impacto, urgencia } = IMPACTO_URGENCIA_POR_PRIORIDADE[a.prioridade];
      const hrefBase = a.entidade_tipo ? HREF_BASE[a.entidade_tipo] : undefined;
      return {
        id: `acao_operacional:${a.id}`,
        tipo: 'acao_operacional' as const,
        texto: a.titulo,
        categoria: CATEGORIA_POR_TIPO[a.tipo] ?? 'operacional',
        href: hrefBase && a.entidade_id ? `${hrefBase}/${a.entidade_id}` : '/operacoes/acoes',
        impacto,
        urgencia,
        prioridade: a.prioridade,
        origem: a.entidade_tipo ?? 'acao_operacional',
        origemId: a.entidade_id ?? a.id,
        origemLabel: a.titulo,
      };
    });
}
