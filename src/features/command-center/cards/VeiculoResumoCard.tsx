import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import type { VeiculoComHealth } from '../engine/fleetHealthEngine';

// Reaproveitado pelos blocos "Veículos Críticos" e "Veículos Destaque" — mesmo formato de
// dado (veículo + healthScore), só a cor muda conforme o contexto.
export function VeiculoResumoCard({ item, tom }: { item: VeiculoComHealth; tom: 'critico' | 'destaque' }) {
  const cor =
    tom === 'critico'
      ? 'text-red-700 dark:text-red-400'
      : 'text-emerald-700 dark:text-emerald-400';

  return (
    <Link
      to={`/veiculos/${item.veiculo.id}`}
      className="flex items-center justify-between rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-white/10 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
    >
      <span className="text-neutral-700 dark:text-neutral-300">
        {item.veiculo.marca.nome} {item.veiculo.modelo.nome} · {item.veiculo.placa}
      </span>
      <span className={cn('font-semibold', cor)}>{item.healthScore.overall}</span>
    </Link>
  );
}
