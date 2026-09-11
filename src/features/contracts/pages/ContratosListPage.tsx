import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { buttonVariants } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { formatDataSimples, formatMoeda } from '@/shared/lib/format';
import { useContratos } from '../hooks/useContratos';
import { StatusBadge } from '../components/StatusBadge';
import { CONTRATO_STATUS_LABEL, type ContratoStatus } from '../types';

export function ContratosListPage() {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<ContratoStatus | 'todos'>('todos');
  const { data: contratos, isLoading, isError } = useContratos({ status, busca });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Contratos</h1>
          <p className="mt-1 text-sm text-neutral-500">Locações entre a RodaVolt, o veículo e o motorista.</p>
        </div>
        <Link to="/contratos/novo" className={buttonVariants({})}>
          <Plus className="h-4 w-4" />
          Novo contrato
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por placa ou nome do motorista…"
            className="pl-9"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as ContratoStatus | 'todos')} className="max-w-xs">
          <option value="todos">Todos os status</option>
          {Object.entries(CONTRATO_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3">Veículo</th>
              <th className="px-4 py-3">Motorista</th>
              <th className="px-4 py-3">Início</th>
              <th className="px-4 py-3">Fim previsto</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  Carregando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-600">
                  Erro ao carregar contratos.
                </td>
              </tr>
            )}
            {!isLoading && contratos?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  Nenhum contrato cadastrado ainda.
                </td>
              </tr>
            )}
            {contratos?.map((contrato) => (
              <tr key={contrato.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                <td className="px-4 py-3">
                  <Link
                    to={`/contratos/${contrato.id}`}
                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {contrato.veiculo?.placa ?? '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{contrato.motorista?.nome_completo ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatDataSimples(contrato.data_inicio)}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatDataSimples(contrato.data_fim_prevista)}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatMoeda(contrato.valor_periodico)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={contrato.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
