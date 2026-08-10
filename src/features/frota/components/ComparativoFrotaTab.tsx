import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCompare } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Select } from '@/shared/components/ui/select';
import { formatMoeda, formatKm } from '@/shared/lib/format';
import { useComparativoFrota } from '../hooks/useComparativoFrota';
import { ordenarComparativo, type ComparativoFrotaItem, type MetricaOrdenacao } from '../intelligence/comparativoFrota';

const METRICAS: Array<{ value: MetricaOrdenacao; label: string }> = [
  { value: 'lucro', label: 'Lucro confirmado' },
  { value: 'roi', label: 'ROI' },
  { value: 'roa', label: 'ROA' },
  { value: 'health', label: 'Health Score' },
  { value: 'km', label: 'Km rodados' },
  { value: 'valor', label: 'Valor atual' },
];

type Agrupamento = 'frota' | 'marca' | 'modelo';

function agruparPor(itens: ComparativoFrotaItem[], agrupamento: Agrupamento): Array<{ chave: string; itens: ComparativoFrotaItem[] }> {
  if (agrupamento === 'frota') return [{ chave: 'Toda a frota', itens }];

  const grupos = new Map<string, ComparativoFrotaItem[]>();
  for (const item of itens) {
    const chave =
      agrupamento === 'marca'
        ? item.veiculo.marca?.nome ?? 'Marca não identificada'
        : `${item.veiculo.marca?.nome ?? '—'} ${item.veiculo.modelo?.nome ?? '(modelo não identificado)'}`;
    const lista = grupos.get(chave);
    if (lista) lista.push(item);
    else grupos.set(chave, [item]);
  }
  return Array.from(grupos.entries()).map(([chave, itens]) => ({ chave, itens }));
}

// Épico 4 — "FROTA", seção 12 (Comparativo). Ranking + segmentação (toda a frota / mesma
// marca / mesmo modelo), tudo com dado 100% real reaproveitado (ver comparativoFrota.ts).
export function ComparativoFrotaTab() {
  const comparativo = useComparativoFrota();
  const [metrica, setMetrica] = useState<MetricaOrdenacao>('lucro');
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('frota');

  const grupos = useMemo(() => {
    if (comparativo.isLoading) return [];
    return agruparPor(comparativo.itens, agrupamento).map((g) => ({ ...g, itens: ordenarComparativo(g.itens, metrica) }));
  }, [comparativo, agrupamento, metrica]);

  if (comparativo.isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" />;
  }

  if (comparativo.itens.length === 0) {
    return (
      <EmptyState
        icon={GitCompare}
        title="Nenhum veículo para comparar"
        description="Cadastre veículos na frota para ver o comparativo e o ranking."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={agrupamento} onChange={(e) => setAgrupamento(e.target.value as Agrupamento)} className="max-w-xs">
          <option value="frota">Toda a frota</option>
          <option value="marca">Agrupar por marca</option>
          <option value="modelo">Agrupar por modelo</option>
        </Select>
        <Select value={metrica} onChange={(e) => setMetrica(e.target.value as MetricaOrdenacao)} className="max-w-xs">
          {METRICAS.map((m) => (
            <option key={m.value} value={m.value}>
              Ordenar por: {m.label}
            </option>
          ))}
        </Select>
      </div>

      {grupos.map((grupo) => (
        <section key={grupo.chave}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {grupo.chave} ({grupo.itens.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Veículo</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">Km</th>
                  <th className="px-4 py-3">Valor atual</th>
                  <th className="px-4 py-3">Lucro confirmado</th>
                  <th className="px-4 py-3">ROI</th>
                  <th className="px-4 py-3">ROA</th>
                  <th className="px-4 py-3">Custo/km</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {grupo.itens.map((item, index) => (
                  <tr key={item.veiculo.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                    <td className="px-4 py-3 text-neutral-400">{index + 1}º</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/veiculos/${item.veiculo.id}`}
                        className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {item.veiculo.placa}
                      </Link>
                      <span className="ml-1 text-neutral-500">
                        {item.veiculo.marca?.nome} {item.veiculo.modelo?.nome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{item.healthScore ?? '—'}</td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatKm(item.km)}</td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                      {item.valorAtual !== null ? formatMoeda(item.valorAtual) : '—'}
                    </td>
                    <td className={`px-4 py-3 font-medium ${item.lucroConfirmado >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                      {formatMoeda(item.lucroConfirmado)}
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                      {item.roiPercentual !== null ? `${item.roiPercentual}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                      {item.roaPercentual !== null ? `${item.roaPercentual}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                      {item.custoPorKm !== null ? formatMoeda(item.custoPorKm) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
