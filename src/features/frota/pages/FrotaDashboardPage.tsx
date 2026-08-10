import { Car, Gauge, Wallet, Activity } from 'lucide-react';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { formatMoeda } from '@/shared/lib/format';
import { useFrotaDashboard } from '../hooks/useFrotaDashboard';

// Épico 4 — menu "Frota". Dashboard da Frota é o placar agregado da frota inteira — mesmo
// papel que DashboardPage.tsx ("Saúde da Empresa") cumpre pra empresa toda, só que escopado a
// veículos. Só números e gráficos (nenhum texto de recomendação/IA), mesma regra de sempre.
//
// Vive como aba dentro de FrotaPage.tsx — sem wrapper de página (p-8) nem h1 próprio, ambos
// responsabilidade de FrotaPage (mesmo racional de VeiculosListPage).
export function FrotaDashboardPage() {
  const dash = useFrotaDashboard();

  if (dash.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <KpiCard icon={Car} label="Total de veículos" value={String(dash.totalVeiculos)} />
        <KpiCard
          icon={Gauge}
          label="Health médio"
          value={dash.resumoHealth.healthMedio !== null ? String(dash.resumoHealth.healthMedio) : '—'}
          hint={`${dash.resumoHealth.veiculosAvaliados} de ${dash.totalVeiculos} avaliados`}
        />
        <KpiCard
          icon={Activity}
          label="Disponibilidade"
          value={dash.disponibilidadePct !== null ? `${dash.disponibilidadePct}%` : '—'}
          hint="Disponível + alugado"
        />
        <KpiCard
          icon={Wallet}
          label="Valor total da frota"
          value={dash.valorTotalFrota !== null ? formatMoeda(dash.valorTotalFrota) : '—'}
          hint={`${dash.veiculosComValor} de ${dash.totalVeiculos} com valor conhecido`}
        />
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Por status</h2>
        <div className="flex flex-wrap gap-3">
          {dash.porStatus
            .filter((s) => s.total > 0)
            .map((s) => (
              <div
                key={s.status}
                className="flex min-w-[120px] flex-1 flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <span className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{s.total}</span>
                <span className="text-[11px] text-neutral-500">{s.label}</span>
              </div>
            ))}
        </div>
      </section>

      {dash.resumoHealth.veiculosCriticos.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Veículos críticos (health &lt; 50)
          </h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {dash.resumoHealth.veiculosCriticos.map(({ veiculo, healthScore }) => (
                  <tr key={veiculo.id}>
                    <td className="px-4 py-2 font-medium text-neutral-800 dark:text-neutral-200">{veiculo.placa}</td>
                    <td className="px-4 py-2 text-neutral-500">
                      {veiculo.marca?.nome} {veiculo.modelo?.nome}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-red-600">{healthScore.overall}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
