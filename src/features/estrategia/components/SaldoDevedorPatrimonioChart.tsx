import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import { reamostrar } from '../lib/chartUtils';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

// Épico 3 — Central de Decisão Empresarial, Card 3 (Saldo Devedor × Patrimônio). As 3 séries que
// o Carlos pediu — "Saldo devedor"/"Financiamento restante" são a mesma coisa no motor
// (saldoDevedorTotal), então viraram uma linha só, não duas repetidas. O ponto central do card é
// o cruzamento: o mês em que valorTotalFrota (o que o veículo vale) passa a valer mais que
// saldoDevedorTotal (o que ainda se deve) — a partir daí patrimonioLiquido fica positivo.
export function SaldoDevedorPatrimonioChart({ meses }: { meses: MesSimulado[] }) {
  const dados = reamostrar(meses, 60).map((m) => ({
    mes: m.mes,
    'Valor do veículo': Math.round(m.valorTotalFrota),
    'Saldo devedor': Math.round(m.saldoDevedorTotal),
    'Patrimônio líquido': Math.round(m.patrimonioLiquido),
  }));

  // Mês exato (não reamostrado) em que o patrimônio líquido vira positivo — honestidade de dado:
  // se nunca cruza dentro do horizonte simulado, não inventa um ponto, só não desenha o marcador.
  const mesDoCruzamento = meses.find((m, i) => i > 0 && m.patrimonioLiquido >= 0 && meses[i - 1].patrimonioLiquido < 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo devedor × Patrimônio</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dados} margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
            <XAxis dataKey="mes" tickFormatter={(v) => `M${v}`} fontSize={11} />
            <YAxis tickFormatter={(v) => formatMoeda(v)} fontSize={10} width={90} />
            <Tooltip formatter={(v) => formatMoeda(Number(v))} labelFormatter={(v) => `Mês ${v}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Valor do veículo" stroke="#8b5cf6" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Saldo devedor" stroke="#ef4444" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="Patrimônio líquido" stroke="#10b981" dot={false} strokeWidth={2.5} />
            {mesDoCruzamento && (
              <ReferenceDot
                x={mesDoCruzamento.mes}
                y={Math.round(mesDoCruzamento.valorTotalFrota)}
                r={5}
                fill="#10b981"
                stroke="white"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        {mesDoCruzamento ? (
          <p className="mt-2 text-xs text-neutral-500">
            No mês <strong className="text-neutral-900 dark:text-neutral-100">{mesDoCruzamento.mes}</strong>, o que a frota vale passa a
            superar o que ainda se deve — o patrimônio líquido vira positivo.
          </p>
        ) : (
          <p className="mt-2 text-xs text-neutral-500">
            Dentro do prazo simulado, o saldo devedor não é superado pelo valor da frota — patrimônio líquido permanece negativo até o
            fim do horizonte.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
