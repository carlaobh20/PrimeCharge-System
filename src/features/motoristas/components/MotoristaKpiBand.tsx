import { CalendarClock, Clock, FileCheck2, HeartPulse, Percent, Timer, TrendingUp, Wallet } from 'lucide-react';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { diasDesde, formatMoeda } from '@/shared/lib/format';
import { useLancamentos } from '@/features/financeiro/hooks/useLancamentos';
import { calcularResumoFinanceiro } from '@/features/financeiro/intelligence';
import type { Motorista } from '../types';
import type { HealthScoreResult } from '../intelligence/types';

// Faixa de KPIs do Cockpit do Motorista (Sprint 6). "Health Score" e "Score documental" já
// eram reais desde a Sprint 6 (Driver Intelligence, DEC-022/DEC-025). "Receita gerada" virou
// real na Missão 4 (Fase 9, auditoria de UX) — mesmo achado #4 já corrigido para Veículo
// (ver VeiculoKpiBand): a tela ficou "Em breve" hardcoded mesmo com `lancamentos.motorista_id`
// já existindo desde a Sprint 8, e o mesmo fix (useLancamentos + calcularResumoFinanceiro,
// nunca duplicando o cálculo) nunca foi replicado aqui. "Tempo médio de contrato",
// "Pontualidade" e "Lifetime Value" continuam "Em breve" de propósito — dependem de cruzar
// Pagamento×Lançamento×Contrato (duração média entre vários contratos, pontualidade de
// pagamento por data_pagamento vs. data_prevista) que ainda não tem nenhuma função de cálculo
// existente para reaproveitar; construir a fórmula agora, sem banco real conectado para
// validar contra, seria o tipo de risco que a Missão 4 (Fase 9) decidiu não assumir — ver
// DEC-106 no DECISION_LOG.md.
export function MotoristaKpiBand({
  motorista,
  healthScore,
}: {
  motorista: Motorista;
  healthScore: HealthScoreResult | null;
}) {
  const diasComoCliente = diasDesde(motorista.criado_em);
  const documental = healthScore?.categorias.find((c) => c.categoria === 'documental') ?? null;

  const { data: lancamentos, isLoading: carregandoLancamentos } = useLancamentos({ motoristaId: motorista.id });
  const resumo = calcularResumoFinanceiro({ lancamentos: lancamentos ?? [], pagamentos: [] });

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <KpiCard
        icon={CalendarClock}
        label="Dias como cliente"
        value={diasComoCliente !== null ? `${diasComoCliente}` : '—'}
        hint="desde o cadastro"
      />
      <KpiCard
        icon={Wallet}
        label="Receita gerada"
        value={carregandoLancamentos ? '' : formatMoeda(resumo.receitaConfirmada)}
        pending={carregandoLancamentos}
      />
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
