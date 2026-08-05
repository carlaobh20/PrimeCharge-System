import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { buttonVariants } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { useVeiculos } from '../hooks/useVeiculos';
import { StatusBadge } from '../components/StatusBadge';
import { VEICULO_STATUS_LABEL, type VeiculoStatus } from '../types';

export function VeiculosListPage() {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<VeiculoStatus | 'todos'>('todos');
  const { data: veiculos, isLoading, isError } = useVeiculos({ status, busca });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Veículos</h1>
          <p className="mt-1 text-sm text-neutral-500">Frota cadastrada na PrimeCharge.</p>
        </div>
        <Link to="/veiculos/novo" className={buttonVariants({})}>
          <Plus className="h-4 w-4" />
          Novo veículo
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por placa, chassi ou RENAVAM…"
            className="pl-9"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as VeiculoStatus | 'todos')} className="max-w-xs">
          <option value="todos">Todos os status</option>
          {Object.entries(VEICULO_STATUS_LABEL).map(([value, label]) => (
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
              <th className="px-4 py-3">Placa</th>
              <th className="px-4 py-3">Marca / Modelo</th>
              <th className="px-4 py-3">Ano</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Km</th>
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
                  Erro ao carregar veículos.
                </td>
              </tr>
            )}
            {!isLoading && veiculos?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  Nenhum veículo cadastrado ainda.
                </td>
              </tr>
            )}
            {veiculos?.map((veiculo) => (
              <tr key={veiculo.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                <td className="px-4 py-3">
                  <Link to={`/veiculos/${veiculo.id}`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                    {veiculo.placa}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                  {veiculo.marca?.nome} {veiculo.modelo?.nome}
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                  {veiculo.ano_fabricacao}/{veiculo.ano_modelo}
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{veiculo.categoria}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={veiculo.status} />
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                  {veiculo.quilometragem.toLocaleString('pt-BR')} km
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
