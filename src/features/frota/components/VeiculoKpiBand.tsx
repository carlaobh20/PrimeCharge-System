import { BatteryCharging, CalendarClock, Gauge, HeartPulse, FileCheck2, TrendingUp, Wallet, Percent } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { formatKm, diasDesde } from '../lib/format';
import type { VeiculoComRelacoes } from '../types';

// Faixa de KPIs do Cockpit. Os que dependem de módulos ainda não construídos (Financeiro,
// Manutenção/Contratos) ficam "Em breve" de propósito — dado real chega quando esses módulos
// existirem (ver conversa de Sprint 2: risco registrado, não é omissão silenciosa).
export function VeiculoKpiBand({ veiculo }: { veiculo: VeiculoComRelacoes }) {
  const diasNaFrota = diasDesde(veiculo.data_compra ?? veiculo.criado_em);

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
      <KpiCard icon={HeartPulse} label="Saúde do ativo" value="" pending />
      <KpiCard icon={FileCheck2} label="Status documental" value="" pending />
    </div>
  );
}
