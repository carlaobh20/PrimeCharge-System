import type { NextAction } from './types';

export type NextActionsInput = {
  totalDocumentos: number;
  totalTags: number;
  cnhValidadeCadastrada: boolean;
};

// Próximas Ações — sempre um convite pra fechar uma lacuna real e concreta, mesmo contrato
// de gerarProximasAcoes (Veículo).
export function gerarProximasAcoes(input: NextActionsInput): NextAction[] {
  const { totalDocumentos, totalTags, cnhValidadeCadastrada } = input;
  const acoes: NextAction[] = [];

  if (totalDocumentos === 0) {
    acoes.push({
      id: 'add-documento',
      texto: 'Cadastrar o primeiro documento (CNH, comprovante de endereço…).',
      actionKey: 'documento',
      categoria: 'documental',
    });
  }

  if (!cnhValidadeCadastrada) {
    acoes.push({
      id: 'add-validade-cnh',
      texto: 'Preencher a validade da CNH.',
      actionKey: 'editar-cnh',
      categoria: 'documental',
    });
  }

  if (totalTags === 0) {
    acoes.push({
      id: 'add-tag',
      texto: 'Adicionar ao menos uma tag para facilitar filtros futuros.',
      actionKey: 'tag',
      categoria: 'operacional',
    });
  }

  return acoes;
}
