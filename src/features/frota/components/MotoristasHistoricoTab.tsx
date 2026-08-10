import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { formatMoeda } from '@/shared/lib/format';
import { useHistoricoMotoristas } from '../hooks/useHistoricoMotoristas';

// Épico 4 — "FROTA". Aba "Motoristas" do Cockpit: histórico completo de quem já dirigiu este
// veículo (brief, seção 5), agrupado por motorista (um motorista pode ter tido mais de um
// contrato com o mesmo veículo).
export function MotoristasHistoricoTab({ veiculoId }: { veiculoId: string }) {
  const historico = useHistoricoMotoristas(veiculoId);

  if (historico.isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" />;
  }

  if (historico.itens.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nenhum motorista ainda"
        description="Quando este veículo entrar em um contrato, os motoristas aparecem aqui."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
          <tr>
            <th className="px-4 py-3">Motorista</th>
            <th className="px-4 py-3">Contratos</th>
            <th className="px-4 py-3">Dias dirigindo</th>
            <th className="px-4 py-3">Receita</th>
            <th className="px-4 py-3">Lucro</th>
            <th className="px-4 py-3">Multas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {historico.itens.map((item) => (
            <tr key={item.motoristaId} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
              <td className="px-4 py-3">
                <Link
                  to={`/motoristas/${item.motoristaId}`}
                  className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {item.nome}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{item.totalContratos}</td>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{item.diasDirigindo}</td>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatMoeda(item.receita)}</td>
              <td className={`px-4 py-3 font-medium ${item.lucro >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                {formatMoeda(item.lucro)}
              </td>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                {item.totalMultas > 0 ? `${item.totalMultas} (${formatMoeda(item.valorMultas)})` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
