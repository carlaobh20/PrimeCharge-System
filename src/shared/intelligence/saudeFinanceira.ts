import type { CategoriaHealthResult } from './types';

export type SaudeFinanceiraInput = {
  /** Pagamentos pendentes já filtrados pela dimensão avaliada (um veículo, um motorista, um contrato) — só precisa da data prevista. */
  pagamentosPendentes: { data_prevista: string }[];
  /** Existe pelo menos um lançamento (qualquer status) vinculado a esta dimensão? Sem isso, a categoria fica sem_dado (DEC-022) — não confunde "nunca teve lançamento" com "está tudo em dia". */
  temAlgumLancamentoVinculado: boolean;
};

// Mesmo raciocínio de gerarRiscos (risks.ts, DEC-025): esta regra não conhece nada sobre
// Veículo, Motorista ou Contrato — só sabe ler "pagamentos pendentes com uma data prevista".
// Por isso mora em shared/ desde já (Sprint 8, DEC-047/DEC-048), reaproveitada pela categoria
// financeira de Veículo/Motorista/Contrato, cada um passando sua própria fatia de dado
// (filtrada por veiculo_id/motorista_id/contrato_id em `features/financeiro/`).
export function calcularSaudeFinanceira(input: SaudeFinanceiraInput): CategoriaHealthResult {
  if (!input.temAlgumLancamentoVinculado) {
    return {
      categoria: 'financeira',
      label: 'Saúde Financeira',
      score: null,
      status: 'sem_dado',
      motivos: ['Nenhum lançamento financeiro vinculado ainda.'],
    };
  }

  const hoje = new Date();
  const atrasados = input.pagamentosPendentes.filter((p) => new Date(p.data_prevista) < hoje);
  const noPrazo = input.pagamentosPendentes.length - atrasados.length;

  const motivos: string[] = [];
  let score = 100;

  if (atrasados.length > 0) {
    score -= Math.min(70, atrasados.length * 25);
    motivos.push(`${atrasados.length} pagamento(s) em atraso.`);
  }
  if (noPrazo > 0) {
    motivos.push(`${noPrazo} pagamento(s) pendente(s), dentro do prazo.`);
  }
  if (motivos.length === 0) {
    motivos.push('Nenhuma pendência financeira em aberto.');
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 80 ? 'ok' : score >= 50 ? 'atencao' : 'critico';

  return { categoria: 'financeira', label: 'Saúde Financeira', score, status, motivos };
}
