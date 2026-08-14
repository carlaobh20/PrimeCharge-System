import { formatMoeda } from '@/shared/lib/format';

export type IndicadoresDoAtivo = {
  roiPercentual: number | null;
  disponibilidadePct: number | null;
  vacanciaPct: number | null;
  oficinaDias: number;
  tempoParadoDias: number;
  lucroPorKm: number | null;
  lucroPorDia: number | null;
};

function Indicador({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-white/10">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  );
}

// Épico 5 — "Consolidação da Arquitetura", item 8. Pedido explícito: "sem IA, sem texto,
// somente indicadores" — por isso NÃO reaproveita HealthScoreCard nem VelocimetroSaudeAtivo
// (os dois motores de health score existentes normalizam tudo pra 0-100 com `motivos: string[]`
// por categoria, exatamente o formato que este pedido evita). Este card é só uma grade de
// valores brutos com unidade real (%, dias, R$), montada com dado já calculado em outro lugar
// (ROI, lucro/km, lucro/dia, tempo por status) — nenhum número novo é inventado aqui, é
// composição de props.
export function IndicadoresDoAtivoCard({ indicadores }: { indicadores: IndicadoresDoAtivo }) {
  const pct = (n: number | null) => (n !== null ? `${n}%` : '—');
  const moeda = (n: number | null) => (n !== null ? formatMoeda(n) : '—');

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Indicadores do Ativo</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador label="ROI" value={pct(indicadores.roiPercentual)} />
        <Indicador label="Disponibilidade" value={pct(indicadores.disponibilidadePct)} />
        <Indicador label="Vacância" value={pct(indicadores.vacanciaPct)} />
        <Indicador label="Dias em oficina" value={`${indicadores.oficinaDias} dia(s)`} />
        <Indicador label="Dias parado" value={`${indicadores.tempoParadoDias} dia(s)`} />
        <Indicador label="Lucro por km" value={moeda(indicadores.lucroPorKm)} />
        <Indicador label="Lucro por dia" value={moeda(indicadores.lucroPorDia)} />
      </div>
    </div>
  );
}
