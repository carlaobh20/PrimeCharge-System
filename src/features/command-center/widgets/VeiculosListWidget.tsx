import { AlertOctagon, Star, type LucideIcon } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { VeiculoResumoCard } from '../cards/VeiculoResumoCard';
import type { VeiculoComHealth } from '../engine/fleetHealthEngine';

const CONFIG: Record<'critico' | 'destaque', { titulo: string; icon: LucideIcon; vazio: string }> = {
  critico: {
    titulo: 'Veículos Críticos',
    icon: AlertOctagon,
    vazio: 'Nenhum veículo com saúde crítica agora.',
  },
  destaque: {
    titulo: 'Veículos Destaque',
    icon: Star,
    vazio: 'Ainda não há veículo destaque — pontuação alta em Health Score qualifica.',
  },
};

// Reaproveitado para "Veículos Críticos" e "Veículos Destaque" — mesmo formato de lista,
// só muda o limiar/tom (calculados juntos em fleetHealthEngine.calcularResumoDaFrota).
export function VeiculosListWidget({ tom, itens }: { tom: 'critico' | 'destaque'; itens: VeiculoComHealth[] }) {
  const config = CONFIG[tom];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <config.icon className="h-3.5 w-3.5" />
        {config.titulo}
      </h2>
      {itens.length === 0 ? (
        <EmptyState icon={config.icon} title="Nada por aqui" description={config.vazio} className="mt-3" />
      ) : (
        <div className="mt-3 space-y-1.5">
          {itens.map((item) => (
            <VeiculoResumoCard key={item.veiculo.id} item={item} tom={tom} />
          ))}
        </div>
      )}
    </div>
  );
}
