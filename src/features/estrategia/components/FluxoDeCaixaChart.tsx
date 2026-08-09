import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import { reamostrar } from '../lib/chartUtils';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

// Épico 3 — Central de Decisão Empresarial, Card 2 (Fluxo de Caixa). Linha mês a mês —
// Receita/Custos/Parcela/Lucro/Saldo, exatamente as 5 séries pedidas. `reamostrar` mora em
// lib/chartUtils.ts (Fase 2 extraiu daqui pra reusar nos Cards 3/6/7 sem duplicar).
//
// Marcadores de compra (pedido do Carlos, 2026-08-09: "quero ver o momento de compra dos carros
// no fluxo, no gráfico"): uma ReferenceLine vertical por mês com `comprasNoMes > 0`, calculada a
// partir do array COMPLETO `meses` (não do `dados` reamostrado) — senão, em horizontes longos onde
// `reamostrar` descarta meses, a marca podia sumir silenciosamente num mês que teve compra de
// verdade. Por isso o XAxis virou `type="number"`: com eixo de categoria, uma ReferenceLine só
// desenha se o valor de x existir EXATAMENTE entre os pontos plotados; com eixo numérico, a
// posição é interpolada na escala, então a marca aparece no lugar certo mesmo se aquele mês
// específico não sobreviveu à reamostragem.
export function FluxoDeCaixaChart({ meses }: { meses: MesSimulado[] }) {
  const dados = reamostrar(meses, 60).map((m) => ({
    mes: m.mes,
    Receita: Math.round(m.receitaMensal),
    Custos: Math.round(m.despesaMensal - m.despesaBreakdown.parcelas),
    Parcela: Math.round(m.despesaBreakdown.parcelas),
    Lucro: Math.round(m.lucroMensal),
    Saldo: Math.round(m.caixaDisponivel),
  }));
  const comprasNoHorizonte = meses.filter((m) => m.comprasNoMes > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de caixa mês a mês</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dados} margin={{ left: 8, right: 16, top: 16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
            <XAxis dataKey="mes" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => `M${v}`} fontSize={11} />
            <YAxis tickFormatter={(v) => formatMoeda(v)} fontSize={10} width={90} />
            <Tooltip formatter={(v) => formatMoeda(Number(v))} labelFormatter={(v) => `Mês ${v}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Receita" stroke="#10b981" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Custos" stroke="#f59e0b" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Parcela" stroke="#ef4444" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Lucro" stroke="#3b82f6" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Saldo" stroke="#8b5cf6" dot={false} strokeWidth={2.5} />
            {comprasNoHorizonte.map((m) => (
              <ReferenceLine
                key={m.mes}
                x={m.mes}
                stroke="#0ea5e9"
                strokeDasharray="2 2"
                strokeOpacity={0.6}
                label={{
                  value: m.comprasNoMes > 1 ? `+${m.comprasNoMes} veíc.` : '+1 veíc.',
                  position: 'top',
                  fontSize: 9,
                  fill: '#0ea5e9',
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {comprasNoHorizonte.length > 0 && (
          <p className="mt-1 text-[11px] text-neutral-400">As linhas verticais tracejadas marcam os meses em que um veículo foi comprado.</p>
        )}
      </CardContent>
    </Card>
  );
}
