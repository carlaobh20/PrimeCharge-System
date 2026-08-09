import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { formatMoeda } from '@/shared/lib/format';
import { useCapitalAllocation } from '../hooks/useCapitalAllocation';
import { extrairMensagemTecnicaDeErro } from '@/shared/lib/errors';

function formatPct(valor: number | null): string {
  return valor === null ? '—' : `${valor.toFixed(1)}%`;
}

// Painel principal do Épico 2 — Fase 2 ("Capital Allocation Center", pedido explícito do
// brief). Responde "onde o capital já investido está performando melhor/pior?" com dado real:
// zero número aqui é calculado por este componente — tudo vem de useCapitalAllocation(), que
// só GRUPA calcularResumoFinanceiro/calcularRoi/calcularPaybackMeses (já existentes) por
// veículo. Gráfico via recharts (Fase 1) — só o ranking por ROI, que é o comparativo mais
// direto para "onde investir o próximo real".
export function CapitalAllocationCenter() {
  const resultado = useCapitalAllocation();

  if (resultado.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 cockpit-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  if (resultado.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        Não consegui calcular o Capital Allocation Center.
        <br />
        Detalhe técnico: {extrairMensagemTecnicaDeErro(resultado.error)}
      </div>
    );
  }

  const { resumo } = resultado;
  const top5 = resumo.rankingPorRoi.slice(0, 5);
  const bottom5 = resumo.rankingPorRoi.slice(-5).reverse();
  const chartData = resumo.rankingPorRoi.map((v) => ({ placa: v.placa, roi: v.roiPercentual }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Wallet} label="Capital investido" value={formatMoeda(resumo.capitalInvestidoContabilizado)} hint={resumo.veiculosSemValorCompra > 0 ? `${resumo.veiculosSemValorCompra} veículo(s) sem valor de compra cadastrado` : undefined} />
        <KpiCard icon={PiggyBank} label="Lucro confirmado da frota" value={formatMoeda(resumo.lucroConfirmadoFrota)} />
        <KpiCard icon={TrendingUp} label="ROI da frota" value={formatPct(resumo.roiFrotaPercentual)} hint="lucro confirmado ÷ capital investido" />
        <KpiCard icon={TrendingDown} label="Veículos rankeados" value={`${resumo.rankingPorRoi.length}`} hint="com valor de compra e ROI calculável" />
      </div>

      {resumo.rankingPorRoi.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Ainda sem ROI calculável"
          description="Nenhum veículo tem valor de compra cadastrado com lucro confirmado suficiente. Cadastre o valor de compra na ficha do veículo para aparecer aqui."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>ROI por veículo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 28)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-neutral-200 dark:stroke-neutral-800" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} fontSize={11} />
                  <YAxis type="category" dataKey="placa" width={70} fontSize={11} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'ROI']} />
                  <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                    {chartData.map((d) => (
                      <Cell key={d.placa} fill={d.roi >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankingCard titulo="Melhor retorno" itens={top5} />
            <RankingCard titulo="Pior retorno" itens={bottom5} />
          </div>
        </>
      )}
    </div>
  );
}

function RankingCard({ titulo, itens }: { titulo: string; itens: { veiculoId: string; placa: string; roiPercentual: number; lucroConfirmado: number; paybackMeses: number | null }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {itens.map((v) => (
          <div key={v.veiculoId} className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 text-sm dark:border-white/5">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{v.placa}</span>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span>{formatMoeda(v.lucroConfirmado)} lucro</span>
              <span className={v.roiPercentual >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
                {formatPct(v.roiPercentual)}
              </span>
              {v.paybackMeses !== null && <span>{v.paybackMeses}m payback</span>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
