import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import { reamostrar } from '../lib/chartUtils';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

// Épico 3 — Central de Decisão Empresarial, Card 2 (Fluxo de Caixa). Linha mês a mês —
// Receita/Custos/Parcela/Lucro/Saldo, exatamente as 5 séries pedidas. `reamostrar` mora em
// lib/chartUtils.ts (Fase 2 extraiu daqui pra reusar nos Cards 3/6/7 sem duplicar).

export function FluxoDeCaixaChart({ meses }: { meses: MesSimulado[] }) {
  const dados = reamostrar(meses, 60).map((m) => ({
    mes: m.mes,
    Receita: Math.round(m.receitaMensal),
    Custos: Math.round(m.despesaMensal - m.despesaBreakdown.parcelas),
    Parcela: Math.round(m.despesaBreakdown.parcelas),
    Lucro: Math.round(m.lucroMensal),
    Saldo: Math.round(m.caixaDisponivel),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de caixa mês a mês</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dados} margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
            <XAxis dataKey="mes" tickFormatter={(v) => `M${v}`} fontSize={11} />
            <YAxis tickFormatter={(v) => formatMoeda(v)} fontSize={10} width={90} />
            <Tooltip formatter={(v) => formatMoeda(Number(v))} labelFormatter={(v) => `Mês ${v}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Receita" stroke="#10b981" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Custos" stroke="#f59e0b" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Parcela" stroke="#ef4444" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Lucro" stroke="#3b82f6" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Saldo" stroke="#8b5cf6" dot={false} strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
