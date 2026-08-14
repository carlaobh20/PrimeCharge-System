// Motor de status de cobrança do lado do motorista.
// Regra do projeto (0006): "vencido/atrasado" NUNCA é um estado persistido — é sempre derivado
// (prevista + data_prevista < hoje). Este é o único lugar que faz essa derivação para o portal;
// nenhuma tela recalcula por conta própria. MOTOR calcula, componente apresenta.

import type { MeuLancamento } from '../api/pagamentos';

export type StatusCobranca = 'pago' | 'em_aberto' | 'vencido' | 'cancelado';

export const STATUS_COBRANCA_LABEL: Record<StatusCobranca, string> = {
  pago: 'Pago',
  em_aberto: 'Em aberto',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};

// Compara só a parte da data (sem hora) — data_prevista é um DATE no banco.
function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Deriva o status de UMA cobrança (lancamento receita) a partir do próprio lançamento e do
// pagamento associado, se houver. Um lançamento 'confirmada' = quitado. 'prevista' + venc <
// hoje = vencido. 'prevista' + venc >= hoje = em aberto. 'cancelada' = cancelado.
export function statusDaCobranca(l: MeuLancamento, hoje: string = hojeISO()): StatusCobranca {
  if (l.status === 'cancelada') return 'cancelado';
  if (l.status === 'confirmada') return 'pago';
  // status === 'prevista'
  return l.data_prevista < hoje ? 'vencido' : 'em_aberto';
}

// A "próxima cobrança": a primeira em_aberto/vencida por data de vencimento. Se houver vencida,
// ela vem primeiro (é a mais urgente). Não projeta cobranças futuras que ainda não existem no
// banco — mostra só o que já foi gerado (honestidade de dado; projeção é uma fase à parte).
export function proximaCobranca(lancamentos: MeuLancamento[], hoje: string = hojeISO()): MeuLancamento | null {
  const abertas = lancamentos
    .filter((l) => {
      const s = statusDaCobranca(l, hoje);
      return s === 'vencido' || s === 'em_aberto';
    })
    .sort((a, b) => a.data_prevista.localeCompare(b.data_prevista));
  return abertas[0] ?? null;
}

// Resumo de "minha situação" para a Home: quantas vencidas, próxima cobrança, tudo em dia.
export type SituacaoFinanceira = {
  vencidas: number;
  proxima: MeuLancamento | null;
  emDia: boolean;
};

export function situacaoFinanceira(lancamentos: MeuLancamento[], hoje: string = hojeISO()): SituacaoFinanceira {
  const vencidas = lancamentos.filter((l) => statusDaCobranca(l, hoje) === 'vencido').length;
  return {
    vencidas,
    proxima: proximaCobranca(lancamentos, hoje),
    emDia: vencidas === 0,
  };
}
