import type { MetricasFunil } from '../../intelligence/funilMetrics';

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  );
}

// Épico 6 — CRM, Fase 1. "Tempo médio" e "Conversão entre etapas" (gráfico do funil, Etapa 4
// do brief) NÃO entram aqui — exigem série histórica de quanto tempo cada motorista passou em
// cada etapa, que só começa a existir a partir de agora (etapa_funil_desde, migration 0025).
// "Conversão" aqui é a foto atual (ativos/total no funil), não uma taxa de coorte real ainda.
export function MetricasFunilPanel({ metricas }: { metricas: MetricasFunil }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Card label="Leads" value={String(metricas.totalLeads)} />
      <Card label="Em análise" value={String(metricas.emAnalise)} />
      <Card label="Aprovados" value={String(metricas.aprovados)} />
      <Card label="Fila (sem veículo)" value={String(metricas.fila)} />
      <Card label="Ativos" value={String(metricas.ativos)} />
      <Card label="Conversão" value={metricas.conversaoLeadParaAtivoPct !== null ? `${metricas.conversaoLeadParaAtivoPct}%` : '—'} />
    </div>
  );
}
