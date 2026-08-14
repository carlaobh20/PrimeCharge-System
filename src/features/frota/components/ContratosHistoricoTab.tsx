import { Link } from 'react-router-dom';
import { FileSignature } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { formatMoeda, formatDataSimples } from '@/shared/lib/format';
import { StatusBadge } from '@/features/contracts/components/StatusBadge';
import { useHistoricoContratos } from '../hooks/useHistoricoContratos';

// Épico 4 — "FROTA". Aba "Contratos" do Cockpit: TODOS os contratos do veículo, não só o
// atual (brief, seção 4). Cada linha abre o contrato correspondente em /contratos/:id — não
// duplica a tela de detalhe do contrato, só linka pra ela.
export function ContratosHistoricoTab({ veiculoId }: { veiculoId: string }) {
  const historico = useHistoricoContratos(veiculoId);

  if (historico.isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" />;
  }

  if (historico.itens.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        title="Nenhum contrato ainda"
        description="Quando este veículo entrar em um contrato, o histórico completo aparece aqui."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
          <tr>
            <th className="px-4 py-3">Motorista</th>
            <th className="px-4 py-3">Período</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Receita</th>
            <th className="px-4 py-3">Lucro</th>
            <th className="px-4 py-3">Multas</th>
            <th className="px-4 py-3">Vacância até o próximo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {historico.itens.map(({ contrato, receita, lucro, totalMultas, valorMultas, vacanciaAteProximoDias }) => (
            <tr key={contrato.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
              <td className="px-4 py-3">
                <Link
                  to={`/contratos/${contrato.id}`}
                  className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {contrato.motorista.nome_completo}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                {formatDataSimples(contrato.data_inicio)} — {contrato.data_fim_real ? formatDataSimples(contrato.data_fim_real) : contrato.data_fim_prevista ? formatDataSimples(contrato.data_fim_prevista) : 'em aberto'}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={contrato.status} />
              </td>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatMoeda(receita)}</td>
              <td className={`px-4 py-3 font-medium ${lucro >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                {formatMoeda(lucro)}
              </td>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                {totalMultas > 0 ? `${totalMultas} (${formatMoeda(valorMultas)})` : '—'}
              </td>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                {vacanciaAteProximoDias !== null ? `${vacanciaAteProximoDias} dias` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
