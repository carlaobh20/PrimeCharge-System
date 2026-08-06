import { BatteryCharging, CalendarClock, Gauge, HeartPulse, FileCheck2, TrendingUp, Wallet, Percent } from 'lucide-react';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { formatMoeda } from '@/shared/lib/format';
import { useLancamentos } from '@/features/financeiro/hooks/useLancamentos';
import { calcularResumoFinanceiro, calcularRoi } from '@/features/financeiro/intelligence';
import { formatKm, diasDesde } from '../lib/format';
import type { VeiculoComRelacoes } from '../types';
import type { HealthScoreResult } from '../intelligence/types';

// Faixa de KPIs do Cockpit. "Saúde do ativo" e "Status documental" são reais desde a Sprint 3
// (Vehicle Intelligence, DEC-022). Receita/Custo/ROI ficaram "Em breve" hardcoded até a
// Missão 4 — achado #4 da auditoria de jornada: a aba Financeiro do mesmo Cockpit já calcula
// os três valores reais desde a Missão 3 (DEC-086), mas ninguém tinha atualizado este band —
// mesma classe de dívida de sincronização que DEC-070 já corrigiu para outro caso. Reusa
// `useLancamentos`/o barril de `financeiro/intelligence` (nunca duplica o cálculo) — o
// React Query dedupe a query se a aba Financeiro também estiver montada.
export function VeiculoKpiBand({
  veiculo,
  healthScore,
}: {
  veiculo: VeiculoComRelacoes;
  healthScore: HealthScoreResult | null;
}) {
  const diasNaFrota = diasDesde(veiculo.data_compra ?? veiculo.criado_em);
  const documental = healthScore?.categorias.find((c) => c.categoria === 'documental') ?? null;

  const { data: lancamentos, isLoading: carregandoLancamentos } = useLancamentos({ veiculoId: veiculo.id });
  const resumo = calcularResumoFinanceiro({ lancamentos: lancamentos ?? [], pagamentos: [] });
  const roi = calcularRoi(resumo.lucroConfirmado, veiculo.valor_compra);

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
      <KpiCard
        icon={Wallet}
        label="Receita acumulada"
        value={carregandoLancamentos ? '' : formatMoeda(resumo.receitaConfirmada)}
        pending={carregandoLancamentos}
      />
      <KpiCard
        icon={TrendingUp}
        label="Custo acumulado"
        value={carregandoLancamentos ? '' : formatMoeda(resumo.despesaConfirmada)}
        pending={carregandoLancamentos}
      />
      <KpiCard
        icon={Percent}
        label="ROI"
        value={carregandoLancamentos || roi.roiPercentual === null ? '' : `${roi.roiPercentual}%`}
        hint={!carregandoLancamentos && roi.roiPercentual === null ? roi.motivos[0] : undefined}
        pending={carregandoLancamentos || roi.roiPercentual === null}
      />
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
