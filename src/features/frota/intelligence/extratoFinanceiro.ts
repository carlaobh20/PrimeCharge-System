import type { Lancamento } from '@/features/financeiro/types';

export type ItemExtrato = {
  lancamento: Pick<Lancamento, 'id' | 'tipo' | 'status' | 'valor' | 'descricao' | 'data_prevista' | 'criado_em'>;
  saldoAcumulado: number;
};

// Épico 5 — "Fleet Intelligence 360", Seção 3 (Extrato Financeiro). "Nunca mostrar apenas
// totais, quero histórico" — a lista de lançamentos já existia (FinanceiroTab), só nunca
// acumulava saldo linha a linha como um extrato bancário de verdade. Mesmo filtro que os
// totais já usavam (exclui só 'cancelada' — 'prevista' e 'confirmada' contam, pra bater com
// os cards de Receita/Despesa/Resultado que já existem acima na mesma aba).
//
// Ordena cronologicamente (mais antigo primeiro) pra acumular o saldo na ordem certa, depois
// devolve em ordem reversa (mais recente primeiro) — mesma convenção visual de extrato
// bancário real: a entrada do topo mostra o saldo mais atual.
export function calcularExtrato(
  lancamentos: Array<Pick<Lancamento, 'id' | 'tipo' | 'status' | 'valor' | 'descricao' | 'data_prevista' | 'criado_em'>>
): ItemExtrato[] {
  const validos = lancamentos.filter((l) => l.status !== 'cancelada');
  const cronologico = [...validos].sort((a, b) => {
    const porData = new Date(a.data_prevista).getTime() - new Date(b.data_prevista).getTime();
    if (porData !== 0) return porData;
    return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
  });

  let saldo = 0;
  const comSaldo: ItemExtrato[] = cronologico.map((lancamento) => {
    saldo += lancamento.tipo === 'receita' ? lancamento.valor : -lancamento.valor;
    return { lancamento, saldoAcumulado: saldo };
  });

  return comSaldo.reverse();
}
