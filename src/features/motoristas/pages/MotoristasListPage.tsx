import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { buttonVariants } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { useMotoristas } from '../hooks/useMotoristas';
import { StatusBadge } from '../components/StatusBadge';
import { MOTORISTA_STATUS_LABEL, type MotoristaStatus } from '../types';

// `?status=` opcional (Épico 1, Centro de Operações) — mesmo raciocínio de VeiculosListPage.
export function MotoristasListPage() {
  const [searchParams] = useSearchParams();
  const statusInicial = (searchParams.get('status') as MotoristaStatus | null) ?? 'todos';
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<MotoristaStatus | 'todos'>(statusInicial);
  const { data: motoristas, isLoading, isError } = useMotoristas({ status, busca });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Motoristas</h1>
          <p className="mt-1 text-sm text-neutral-500">Clientes cadastrados na PrimeCharge.</p>
        </div>
        <Link to="/motoristas/novo" className={buttonVariants({})}>
          <Plus className="h-4 w-4" />
          Novo motorista
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF ou e-mail…"
            className="pl-9"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as MotoristaStatus | 'todos')} className="max-w-xs">
          <option value="todos">Todos os status</option>
          {Object.entries(MOTORISTA_STATUS_LABEL).map(([value, label]) => (
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
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">CPF</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  Carregando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-600">
                  Erro ao carregar motoristas.
                </td>
              </tr>
            )}
            {!isLoading && motoristas?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  Nenhum motorista cadastrado ainda.
                </td>
              </tr>
            )}
            {motoristas?.map((motorista) => (
              <tr key={motorista.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                <td className="px-4 py-3">
                  <Link
                    to={`/motoristas/${motorista.id}`}
                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {motorista.nome_completo}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{motorista.cpf}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{motorista.telefone ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{motorista.cidade ?? '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={motorista.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
