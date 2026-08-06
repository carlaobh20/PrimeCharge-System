import type { Motorista } from '@/features/motoristas/types';
import type { ContratoComRelacoes } from '@/features/contracts/types';
import type { PagamentoComRelacoes } from '@/features/financeiro/types';
import type { Arquivo } from '@/shared/capabilities/types';
import { gerarAcoesCnhVencendo } from './geradores/motoristaGeradores';
import { gerarAcoesContratoVencendo } from './geradores/contratoGeradores';
import { gerarAcoesPagamentoAtrasado, gerarAcoesParcelaAVencer } from './geradores/financeiroGeradores';
import { gerarAcoesChecklistAbertoDemorado } from './geradores/checklistGeradores';
import { gerarAcoesManutencaoAgendadaVencendo } from './geradores/manutencaoGeradores';
import { gerarAcoesDocumentoVeiculoVencendo } from './geradores/documentoGeradores';
import type { AcaoCandidata, Checklist, Manutencao } from '../types';

export type MontarCandidatasInput = {
  motoristas: Motorista[];
  contratos: ContratoComRelacoes[];
  pagamentosPendentes: PagamentoComRelacoes[];
  checklistsAbertos: Checklist[];
  manutencoesAgendadas: Manutencao[];
  arquivosComValidade: Arquivo[];
};

// Função pura (DEC-055) — junta o resultado dos geradores. Missão 4 (Fase 3) estendeu de 3
// pra 7: os 4 novos fecham achados da auditoria de jornada operacional (checklist/vistoria
// pendente, manutenção agendada vencendo, documento de veículo vencendo, parcela a vencer —
// antes só existia "já atrasada"). Cada gerador novo só precisou ser adicionado aqui, sem
// mexer em nada mais — confirma que este continua sendo o ponto de extensão certo, sem
// precisar de um "Automation Engine" genérico (DEC-055 segue válida).
export function montarCandidatas(input: MontarCandidatasInput): AcaoCandidata[] {
  return [
    ...gerarAcoesCnhVencendo(input.motoristas),
    ...gerarAcoesContratoVencendo(input.contratos),
    ...gerarAcoesPagamentoAtrasado(input.pagamentosPendentes),
    ...gerarAcoesParcelaAVencer(input.pagamentosPendentes),
    ...gerarAcoesChecklistAbertoDemorado(input.checklistsAbertos),
    ...gerarAcoesManutencaoAgendadaVencendo(input.manutencoesAgendadas),
    ...gerarAcoesDocumentoVeiculoVencendo(input.arquivosComValidade),
  ];
}
