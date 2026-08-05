import { CalendarClock, CalendarX2, HeartPulse, Percent, Receipt, Wallet } from 'lucide-react';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { diasDesde, diasAte, formatMoeda } from '@/shared/lib/format';
import type { ContratoComRelacoes } from '../types';
import type { HealthScoreResult } from '../intelligence/types';

// Faixa de KPIs do Cockpit do Contrato (Sprint 7). "Pagamentos recebidos" e "Inadimplência"
// ficam "Em breve" de propósito, nunca com número inventado (regra de Honestidade da sprint e
// DEC-021) — dependem do módulo Financeiro. "Health Score" e "Score comercial" já são reais
// desde já (Contract Intelligence).
export function ContratoKpiBand({
  contrato,
  healthScore,
}: {
  contrato: ContratoComRelacoes;
  healthScore: HealthScoreResult | null;
}) {
  const diasDeContrato = contrato.status === 'ativo' ? diasDesde(contrato.data_inicio) : null;
  const diasAteVencimento = diasAte(contrato.data_fim_prevista);
  const comercial = healthScore?.categorias.find((c) => c.categoria === 'comercial') ?? null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <KpiCard
        icon={CalendarClock}
        label="Dias de contrato"
        value={diasDeContrato !== null ? `${diasDeContrato}` : '—'}
        hint={contrato.status === 'ativo' ? 'desde o início' : undefined}
      />
      <KpiCard icon={Wallet} label="Tarifa contratada" value={formatMoeda(contrato.valor_periodico)} />
      <KpiCard
        icon={CalendarX2}
        label="Vencimento"
        value={diasAteVencimento !== null ? `${diasAteVencimento}d` : '—'}
        hint={diasAteVencimento !== null ? 'dias restantes' : 'sem data prevista'}
      />
      <KpiCard icon={Receipt} label="Pagamentos recebidos" value="" pending />
      <KpiCard icon={Percent} label="Inadimplência" value="" pending />
      <KpiCard
        icon={HeartPulse}
        label="Health Score"
        value={healthScore?.overall !== null && healthScore?.overall !== undefined ? `${healthScore.overall}` : ''}
        hint={healthScore ? `${healthScore.categoriasAvaliadas}/${healthScore.categoriasTotais} categorias` : undefined}
        pending={!healthScore || healthScore.overall === null}
      />
      <KpiCard
        icon={CalendarClock}
        label="Score comercial"
        value={comercial?.score !== null && comercial?.score !== undefined ? `${comercial.score}` : ''}
        pending={!comercial || comercial.score === null}
      />
    </div>
  );
}
