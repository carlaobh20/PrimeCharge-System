import { CalendarClock, Clock, FileCheck2, HeartPulse, Percent, Timer, TrendingUp, Wallet } from 'lucide-react';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { diasDesde } from '@/shared/lib/format';
import type { Motorista } from '../types';
import type { HealthScoreResult } from '../intelligence/types';

// Faixa de KPIs do Cockpit do Motorista (Sprint 6). Os que dependem de módulos ainda não
// construídos (Contratos, Financeiro) ficam "Em breve" de propósito, nunca com número
// inventado (ver DEC-021). "Health Score" e "Score documental" já são reais desde já (Driver
// Intelligence, DEC-022/DEC-025) — vêm do mesmo healthScore usado na aba Indicadores.
export function MotoristaKpiBand({
  motorista,
  healthScore,
}: {
  motorista: Motorista;
  healthScore: HealthScoreResult | null;
}) {
  const diasComoCliente = diasDesde(motorista.criado_em);
  const documental = healthScore?.categorias.find((c) => c.categoria === 'documental') ?? null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <KpiCard
        icon={CalendarClock}
        label="Dias como cliente"
        value={diasComoCliente !== null ? `${diasComoCliente}` : '—'}
        hint="desde o cadastro"
      />
      <KpiCard icon={Wallet} label="Receita gerada" value="" pending />
      <KpiCard icon={Clock} label="Tempo médio de contrato" value="" pending />
      <KpiCard icon={Timer} label="Pontualidade" value="" pending />
      <KpiCard icon={Percent} label="Inadimplência" value="" pending />
      <KpiCard
        icon={HeartPulse}
        label="Health Score"
        value={healthScore?.overall !== null && healthScore?.overall !== undefined ? `${healthScore.overall}` : ''}
        hint={healthScore ? `${healthScore.categoriasAvaliadas}/${healthScore.categoriasTotais} categorias` : undefined}
        pending={!healthScore || healthScore.overall === null}
      />
      <KpiCard icon={TrendingUp} label="Lifetime Value" value="" pending />
      <KpiCard
        icon={FileCheck2}
        label="Score documental"
        value={documental?.score !== null && documental?.score !== undefined ? `${documental.score}` : ''}
        pending={!documental || documental.score === null}
      />
    </div>
  );
}
