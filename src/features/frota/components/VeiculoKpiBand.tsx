import { BatteryCharging, CalendarClock, Gauge, HeartPulse, FileCheck2, TrendingUp, Wallet, Percent } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { formatKm, diasDesde } from '../lib/format';
import type { VeiculoComRelacoes } from '../types';
import type { HealthScoreResult } from '../intelligence/types';

// Faixa de KPIs do Cockpit. Os que dependem de módulos ainda não construídos (Financeiro,
// Manutenção/Contratos) ficam "Em breve" de propósito — dado real chega quando esses módulos
// existirem (ver DEC-021). "Saúde do ativo" e "Status documental" já são reais desde a
// Sprint 3 (Vehicle Intelligence, DEC-022) — vêm do mesmo healthScore usado na aba Indicadores.
export function VeiculoKpiBand({
  veiculo,
  healthScore,
}: {
  veiculo: VeiculoComRelacoes;
  healthScore: HealthScoreResult | null;
}) {
  const diasNaFrota = diasDesde(veiculo.data_compra ?? veiculo.criado_em);
  const documental = healthScore?.categorias.find((c) => c.categoria === 'documental') ?? null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <KpiCard
        icon={CalendarClock}
        label="Dias em operação"
        value={diasNaFrota !== null ? `${diasNaFrota}` : '—'}
        hint={veiculo.data_compra ? 'desde a compra' : 'desde o cadastro'}
      />
      <KpiCard icon={Gauge} label="Km rodados" value={formatKm(veiculo.quilometragem)} />
      <KpiCard
        icon={BatteryCharging}
        label="Autonomia"
        value={veiculo.autonomia_km ? `${veiculo.autonomia_km} km` : '—'}
      />
      <KpiCard icon={Wallet} label="Receita acumulada" value="" pending />
      <KpiCard icon={TrendingUp} label="Custo acumulado" value="" pending />
      <KpiCard icon={Percent} label="ROI" value="" pending />
      <KpiCard
        icon={HeartPulse}
        label="Saúde do ativo"
        value={healthScore?.overall !== null && healthScore?.overall !== undefined ? `${healthScore.overall}` : ''}
        hint={healthScore ? `${healthScore.categoriasAvaliadas}/${healthScore.categoriasTotais} categorias` : undefined}
        pending={!healthScore || healthScore.overall === null}
      />
      <KpiCard
        icon={FileCheck2}
        label="Status documental"
        value={documental?.score !== null && documental?.score !== undefined ? `${documental.score}` : ''}
        pending={!documental || documental.score === null}
      />
    </div>
  );
}
