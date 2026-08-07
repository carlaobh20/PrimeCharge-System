// Missão 7 — Modo Simulação: réplica dos triggers de banco que a UI depende para os
// cálculos "funcionarem normalmente" (pedido explícito: "nada pode ser mockado").
//
// Só os dois triggers que têm efeito visível fora da própria linha alterada (os outros —
// `trg_*_valida_transicao` — só bloqueiam updates inválidos; a simulação deliberadamente não
// replica validação de transição de estado, ver relatório final da Missão 7, seção "o que
// ainda falta"):
//
// 1. fn_manutencao_gera_lancamento (migration 0012): manutenção marcada 'realizada' com
//    custo > 0 gera um Lançamento de despesa automaticamente.
// 2. fn_propagar_status_pagamento (migration 0006): pagamento marcado 'pago' propaga
//    status 'confirmada' pro Lançamento vinculado.

import { simulationStore, type Row } from './store';
import { SIMULATION_EMPRESA_ID, SIMULATION_CENTRO_CUSTO_MANUTENCAO_ID } from './constants';

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'sim-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function manutencaoJaGerouLancamento(manutencaoId: string): boolean {
  return simulationStore.getAll('lancamentos').some((l) => l.manutencao_id === manutencaoId);
}

function handleManutencaoSideEffect(row: Row) {
  const custo = row.custo as number | null;
  if (row.status_execucao !== 'realizada' || custo == null || custo <= 0) return;
  if (manutencaoJaGerouLancamento(row.id as string)) return;

  const now = new Date().toISOString();
  const veiculo = simulationStore.getAll('veiculos').find((v) => v.id === row.veiculo_id);
  simulationStore.insert('lancamentos', [
    {
      id: generateId(),
      empresa_id: SIMULATION_EMPRESA_ID,
      tipo: 'despesa',
      status: 'confirmada',
      descricao: `Manutenção: ${row.descricao as string}${veiculo ? ' — ' + (veiculo.placa as string) : ''}`,
      valor: custo,
      categoria: 'manutencao',
      centro_custo_id: SIMULATION_CENTRO_CUSTO_MANUTENCAO_ID,
      contrato_id: null,
      veiculo_id: row.veiculo_id,
      motorista_id: null,
      data_prevista: row.data_execucao,
      data_confirmacao: row.data_execucao,
      criado_via: 'automacao',
      observacoes: '[SIMULAÇÃO] gerado automaticamente a partir da manutenção',
      manutencao_id: row.id,
      criado_em: now,
      atualizado_em: now,
    },
  ]);
}

function handlePagamentoSideEffect(row: Row) {
  if (row.status !== 'pago') return;
  const lancamentoId = row.lancamento_id as string | undefined;
  if (!lancamentoId) return;
  simulationStore.update(
    'lancamentos',
    (l) => l.id === lancamentoId && l.status !== 'confirmada',
    { status: 'confirmada', data_confirmacao: (row.data_pagamento as string | null) ?? new Date().toISOString().slice(0, 10) }
  );
}

export function applyMutationSideEffects(table: string, _op: 'insert' | 'update', rows: Row[]) {
  if (table === 'manutencoes') {
    rows.forEach(handleManutencaoSideEffect);
  }
  if (table === 'pagamentos') {
    rows.forEach(handlePagamentoSideEffect);
  }
}
