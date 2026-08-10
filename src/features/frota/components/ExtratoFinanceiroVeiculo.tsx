import { Badge } from '@/shared/components/ui/badge';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { LANCAMENTO_STATUS_LABEL, LANCAMENTO_TIPO_LABEL, type Lancamento, type LancamentoStatus } from '@/features/financeiro/types';
import { calcularExtrato } from '../intelligence/extratoFinanceiro';

const STATUS_BADGE: Record<LancamentoStatus, 'warning' | 'success' | 'secondary'> = {
  prevista: 'warning',
  confirmada: 'success',
  cancelada: 'secondary',
};

// Épico 5 — Seção 3, Extrato Financeiro. Substitui a lista solta que existia antes (cada
// lançamento mostrava só o próprio valor, sem acumular) por algo que se lê como extrato
// bancário de verdade: saldo evoluindo linha a linha, mais recente no topo.
export function ExtratoFinanceiroVeiculo({
  lancamentos,
}: {
  lancamentos: Array<Pick<Lancamento, 'id' | 'tipo' | 'status' | 'valor' | 'descricao' | 'data_prevista' | 'criado_em'>>;
}) {
  const extrato = calcularExtrato(lancamentos);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
          <tr>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Descrição</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3 text-right">Saldo acumulado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {extrato.map(({ lancamento: l, saldoAcumulado }) => (
            <tr key={l.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
              <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">{formatDataSimples(l.data_prevista)}</td>
              <td className="px-4 py-2.5">
                <p className="truncate text-neutral-700 dark:text-neutral-300">{l.descricao}</p>
                <span className="text-[11px] text-neutral-400">{LANCAMENTO_TIPO_LABEL[l.tipo]}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <Badge variant={STATUS_BADGE[l.status]}>{LANCAMENTO_STATUS_LABEL[l.status]}</Badge>
              </td>
              <td className={`whitespace-nowrap px-4 py-2.5 text-right font-medium ${l.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                {l.tipo === 'receita' ? '+' : '−'}
                {formatMoeda(l.valor)}
              </td>
              <td
                className={`whitespace-nowrap px-4 py-2.5 text-right font-semibold ${saldoAcumulado >= 0 ? 'text-neutral-900 dark:text-neutral-100' : 'text-red-600'}`}
              >
                {formatMoeda(saldoAcumulado)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
