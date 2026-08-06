import { CalendarClock, CalendarX2, HeartPulse, Percent, Receipt, Wallet } from 'lucide-react';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { diasDesde, diasAte, formatMoeda } from '@/shared/lib/format';
import { useLancamentos } from '@/features/financeiro/hooks/useLancamentos';
import { calcularResumoFinanceiro } from '@/features/financeiro/intelligence';
import type { ContratoComRelacoes } from '../types';
import type { HealthScoreResult } from '../intelligence/types';

// Faixa de KPIs do Cockpit do Contrato (Sprint 7). "Health Score" e "Score comercial" já eram
// reais desde já (Contract Intelligence). "Pagamentos recebidos" virou real na Missão 4 (Fase
// 9, auditoria de UX) — mesmo achado #4 já corrigido para Veículo (ver VeiculoKpiBand):
// `lancamentos.contrato_id` já existia, só faltava religar este band a ele. "Inadimplência"
// continua "Em breve" — calcular corretamente exige cruzar Pagamento×Lançamento (pagamentos
// não têm `contrato_id` próprio, só `lancamento_id`), e nenhuma função de cálculo existente
// cobre esse cruzamento hoje; construir a fórmula agora, sem banco real conectado para validar
// contra, foi decisão deliberada de não assumir esse risco — ver DEC-106 no DECISION_LOG.md.
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

  const { data: lancamentos, isLoading: carregandoLancamentos } = useLancamentos({ contratoId: contrato.id });
  const resumo = calcularResumoFinanceiro({ lancamentos: lancamentos ?? [], pagamentos: [] });

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
      <KpiCard
        icon={Receipt}
        label="Pagamentos recebidos"
        value={carregandoLancamentos ? '' : formatMoeda(resumo.receitaConfirmada)}
        pending={carregandoLancamentos}
      />
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
