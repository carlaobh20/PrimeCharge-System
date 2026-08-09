import type { ContaBancaria, Lancamento, Pagamento } from '../types';

export type ResumoFinanceiroInput = {
  lancamentos: Pick<Lancamento, 'tipo' | 'status' | 'valor'>[];
  /** Pagamentos já filtrados para a mesma dimensão/período dos lançamentos acima, cada um com o tipo do lançamento de origem anexado por quem chama. */
  pagamentos: (Pick<Pagamento, 'status' | 'data_prevista' | 'data_pagamento' | 'valor'> & { tipo: 'receita' | 'despesa' })[];
};

export type ResumoFinanceiro = {
  receitaConfirmada: number;
  despesaConfirmada: number;
  receitaPrevista: number;
  despesaPrevista: number;
  lucroConfirmado: number;
  lucroPrevisto: number;
  /** Soma de lançamentos tipo receita cancelados — dinheiro que era esperado e nunca vai entrar. */
  receitaPerdida: number;
  /** Soma de pagamentos pagos cuja data_pagamento veio depois da data_prevista — receita que estava atrasada e foi cobrada de volta. */
  receitaRecuperada: number;
};

/**
 * Agregação real sobre lancamentos/pagamentos — responde diretamente "quanto cada veículo/
 * contrato/motorista gera de lucro", "receita perdida", "receita recuperada" (briefing da
 * Sprint 8), sem tabela nova (DEC-046) e sem motor genérico (é soma simples sobre dado real).
 * Reutilizável tanto para uma dimensão (filtrar antes de chamar) quanto, no futuro, para uma
 * Visão Geral consolidada (DEC-052) — mesma função, filtro diferente de quem chama.
 */
export function calcularResumoFinanceiro(input: ResumoFinanceiroInput): ResumoFinanceiro {
  const somaPor = (tipo: 'receita' | 'despesa', status: 'confirmada' | 'prevista' | 'cancelada') =>
    input.lancamentos.filter((l) => l.tipo === tipo && l.status === status).reduce((soma, l) => soma + l.valor, 0);

  const receitaConfirmada = somaPor('receita', 'confirmada');
  const despesaConfirmada = somaPor('despesa', 'confirmada');
  const receitaPrevista = somaPor('receita', 'prevista');
  const despesaPrevista = somaPor('despesa', 'prevista');
  const receitaPerdida = somaPor('receita', 'cancelada');

  const receitaRecuperada = input.pagamentos
    .filter((p) => p.tipo === 'receita' && p.status === 'pago' && p.data_pagamento && p.data_pagamento > p.data_prevista)
    .reduce((soma, p) => soma + p.valor, 0);

  return {
    receitaConfirmada,
    despesaConfirmada,
    receitaPrevista,
    despesaPrevista,
    lucroConfirmado: receitaConfirmada - despesaConfirmada,
    lucroPrevisto: receitaPrevista - despesaPrevista,
    receitaPerdida,
    receitaRecuperada,
  };
}

// Achado da auditoria do Épico 1 (Operação Perfeita, achado #2): ContasBancariasPage só
// mostrava "Saldo inicial" — o valor cadastrado na criação da conta, nunca atualizado. Não
// existe (e não deveria existir) uma coluna `saldo_atual` persistida: assim como
// calcularResumoFinanceiro acima, o saldo de verdade é sempre derivado, nunca guardado
// (evita o saldo "dessincronizar" do histórico real de pagamentos). Mesmo raciocínio de
// separação de dimensão de calcularResumoFinanceiro, mas por `conta_bancaria_id` em vez de
// por tipo/status de lançamento — e sobre `pagamentos` (o que realmente entrou/saiu da
// conta), não sobre `lancamentos` (o que era esperado).
export function calcularSaldoPorConta(
  contas: Pick<ContaBancaria, 'id' | 'saldo_inicial'>[],
  pagamentosPagos: (Pick<Pagamento, 'conta_bancaria_id' | 'valor'> & { tipo: 'receita' | 'despesa' })[]
): Record<string, number> {
  const saldos: Record<string, number> = {};
  for (const conta of contas) saldos[conta.id] = conta.saldo_inicial;

  for (const pagamento of pagamentosPagos) {
    if (!(pagamento.conta_bancaria_id in saldos)) continue; // pagamento de conta já excluída/inativa — ignora, não quebra o cálculo
    const delta = pagamento.tipo === 'receita' ? pagamento.valor : -pagamento.valor;
    saldos[pagamento.conta_bancaria_id] += delta;
  }

  return saldos;
}
