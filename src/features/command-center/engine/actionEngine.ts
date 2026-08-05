import type { VeiculoIntelligenceSnapshot } from '../services/fleetIntelligenceCollector';
import type { PrioritizedAction } from '../types';
import { calcularPrioridade } from './priorityEngine';

// ActionEngine — consolida as Próximas Ações que Vehicle Intelligence já calculou por
// veículo. Decisão de escopo desta sprint (ver DEC-024): clicar numa ação aqui NÃO abre o
// dialog do Command Action direto na Home — leva pro Cockpit do veículo (mesma tela que já
// tem os 11 Command Actions prontos, Sprint 2). Duplicar os dialogs na Home multiplicaria
// manutenção sem ganho real; a Home aponta o "onde", o Cockpit resolve o "como".
export function consolidarAcoes(frota: VeiculoIntelligenceSnapshot[]): PrioritizedAction[] {
  return frota.flatMap(({ veiculo, proximasAcoes }) =>
    proximasAcoes.map((acao) => {
      const impacto = 'medio';
      const urgencia = 'media';
      return {
        ...acao,
        id: `${veiculo.id}-${acao.id}`,
        href: acao.actionKey === 'editar-valores' ? `/veiculos/${veiculo.id}/editar` : `/veiculos/${veiculo.id}`,
        impacto,
        urgencia,
        prioridade: calcularPrioridade(impacto, urgencia),
        origem: 'veiculo',
        origemId: veiculo.id,
        origemLabel: veiculo.placa,
      } satisfies PrioritizedAction;
    })
  );
}
