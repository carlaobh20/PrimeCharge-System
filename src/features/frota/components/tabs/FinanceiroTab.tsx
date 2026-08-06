import { Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { useLancamentos } from '@/features/financeiro/hooks/useLancamentos';
import { LANCAMENTO_STATUS_LABEL, LANCAMENTO_TIPO_LABEL, type LancamentoStatus } from '@/features/financeiro/types';

const STATUS_BADGE: Record<LancamentoStatus, 'warning' | 'success' | 'secondary'> = {
  prevista: 'warning',
  confirmada: 'success',
  cancelada: 'secondary',
};

// Antes desta correção (auditoria da Missão 2, 2026-08-06), esta aba era um EmptyState estático
// dizendo "aguardando o módulo Financeiro/Contratos" — desatualizado desde a Sprint 8, quando
// `lancamentos.veiculo_id` já existia e nunca tinha sido conectado aqui. Mesma classe de dívida
// que DEC-070 fechou para o Health Score Comercial.
export function FinanceiroTab({ veiculoId }: { veiculoId: string }) {
  const { data: lancamentos, isLoading } = useLancamentos({ veiculoId });

  const receitas = (lancamentos ?? []).filter((l) => l.tipo === 'receita' && l.status !== 'cancelada');
  const despesas = (lancamentos ?? []).filter((l) => l.tipo === 'despesa' && l.status !== 'cancelada');
  const totalReceita = receitas.reduce((soma, l) => soma + l.valor, 0);
  const totalDespesa = despesas.reduce((soma, l) => soma + l.valor, 0);

  if (isLoading) {
    return <div className="h-32 cockpit-shimmer rounded-2xl" />;
  }

  if ((lancamentos?.length ?? 0) === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Nenhum lançamento vinculado a este veículo ainda"
        description="Receita, despesa e manutenção aparecem aqui quando um Lançamento (ou uma Manutenção) marcar este veículo."
        action={
          <Link to="/financeiro/lancamentos">
            <Button type="button" variant="outline" size="sm">
              Ir para Lançamentos
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
          <p className="text-xs text-neutral-500">Receita</p>
          <p className="text-lg font-semibold text-emerald-600">{formatMoeda(totalReceita)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
          <p className="text-xs text-neutral-500">Despesa</p>
          <p className="text-lg font-semibold text-red-600">{formatMoeda(totalDespesa)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
          <p className="text-xs text-neutral-500">Resultado</p>
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{formatMoeda(totalReceita - totalDespesa)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {lancamentos!.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-2.5 dark:border-white/10">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_BADGE[l.status]}>{LANCAMENTO_STATUS_LABEL[l.status]}</Badge>
                <span className="text-xs text-neutral-500">{LANCAMENTO_TIPO_LABEL[l.tipo]}</span>
              </div>
              <p className="truncate text-sm text-neutral-700 dark:text-neutral-300">{l.descricao}</p>
              <p className="text-xs text-neutral-400">{formatDataSimples(l.data_prevista)}</p>
            </div>
            <p className={`shrink-0 text-sm font-medium ${l.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatMoeda(l.valor)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
