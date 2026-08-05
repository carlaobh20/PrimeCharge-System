import type { Veiculo } from '../types';
import type { NextAction } from './types';

export type NextActionsInput = {
  veiculo: Pick<Veiculo, 'valor_mercado' | 'valor_fipe'>;
  totalDocumentos: number;
  totalTags: number;
};

// Próximas Ações — sempre um convite pra fechar uma lacuna real e concreta, nunca um
// to-do genérico. Cada item aponta pra um Command Action que já existe (Sprint 2),
// então clicar de fato resolve a lacuna, não é decorativo.
export function gerarProximasAcoes(input: NextActionsInput): NextAction[] {
  const { veiculo, totalDocumentos, totalTags } = input;
  const acoes: NextAction[] = [];

  if (totalDocumentos === 0) {
    acoes.push({ id: 'add-documento', texto: 'Cadastrar o primeiro documento (CRLV, seguro…).', actionKey: 'documento' });
  }

  if (veiculo.valor_mercado === null && veiculo.valor_fipe === null) {
    acoes.push({ id: 'add-valores', texto: 'Preencher valor de mercado ou FIPE.', actionKey: 'editar-valores' });
  }

  if (totalTags === 0) {
    acoes.push({ id: 'add-tag', texto: 'Adicionar ao menos uma tag para facilitar filtros futuros.', actionKey: 'tag' });
  }

  return acoes;
}
