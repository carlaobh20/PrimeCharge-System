import type { EntityIntelligenceSnapshot, PrioritizedAction } from '../types';
import { calcularPrioridade } from './priorityEngine';

// ActionEngine — consolida as Próximas Ações que cada feature já calculou por entidade.
// Decisão de escopo (ver DEC-024): clicar numa ação aqui NÃO abre o dialog do Command Action
// direto na Home — leva pro Cockpit da entidade (mesma tela que já tem os Command Actions
// prontos). Duplicar os dialogs na Home multiplicaria manutenção sem ganho real; a Home
// aponta o "onde", o Cockpit resolve o "como". Desde a Sprint 7 (DEC-038), formato genérico
// (ver alertEngine.ts): o link de edição não é mais hardcoded por feature — qualquer
// actionKey que comece com "editar" (convenção já usada por Veículo `editar-valores` e
// Motorista `editar-cnh`) aponta pra `${hrefBase}/editar`; o resto aponta pro Cockpit.
export function consolidarAcoes(entidades: EntityIntelligenceSnapshot[]): PrioritizedAction[] {
  return entidades.flatMap(({ origemTipo, origemId, origemLabel, hrefBase, proximasAcoes }) =>
    proximasAcoes.map((acao) => {
      const impacto = 'medio';
      const urgencia = 'media';
      return {
        ...acao,
        id: `${origemId}-${acao.id}`,
        href: acao.actionKey.startsWith('editar') ? `${hrefBase}/editar` : hrefBase,
        impacto,
        urgencia,
        prioridade: calcularPrioridade(impacto, urgencia),
        origem: origemTipo,
        origemId,
        origemLabel,
      } satisfies PrioritizedAction;
    })
  );
}
