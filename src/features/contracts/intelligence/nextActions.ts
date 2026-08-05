import type { ContratoStatus } from '../types';
import type { NextAction } from './types';

export type NextActionsInput = {
  status: ContratoStatus;
  totalDocumentos: number;
  diasAteVencimento: number | null;
};

const AVANCO_POR_STATUS: Partial<Record<ContratoStatus, string>> = {
  rascunho: 'Enviar contrato para análise.',
  em_analise: 'Aprovar contrato.',
  aprovado: 'Registrar assinatura do contrato.',
  assinado: 'Ativar contrato.',
};

// Próximas Ações — sempre um convite pra fechar uma lacuna real e concreta, mesmo contrato de
// gerarProximasAcoes (Veículo/Motorista). A ação de avanço de status aponta sempre pra
// 'status' (o dialog de transição já mostra só os próximos estados válidos, ver
// CONTRATO_STATUS_TRANSITIONS) — nunca uma ação dedicada por status, pra não duplicar a
// state machine em dois lugares.
export function gerarProximasAcoes(input: NextActionsInput): NextAction[] {
  const { status, totalDocumentos, diasAteVencimento } = input;
  const acoes: NextAction[] = [];

  const avanco = AVANCO_POR_STATUS[status];
  if (avanco) {
    acoes.push({ id: 'avancar-status', texto: avanco, actionKey: 'status', categoria: 'operacional' });
  }

  if (totalDocumentos === 0) {
    acoes.push({
      id: 'add-documento',
      texto: 'Anexar o contrato assinado (ou outro documento comprobatório).',
      actionKey: 'documento',
      categoria: 'documental',
    });
  }

  if (status === 'ativo' && diasAteVencimento !== null && diasAteVencimento <= 15) {
    acoes.push({
      id: 'renovar-ou-encerrar',
      texto: 'Registrar renovação ou encerramento antes do vencimento.',
      actionKey: 'renovar',
      categoria: 'comercial',
    });
  }

  return acoes;
}
