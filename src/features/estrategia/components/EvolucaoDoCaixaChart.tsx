import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import { reamostrar } from '../lib/chartUtils';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

// Épico 3 — Central de Decisão Empresarial, Card 6 (Evolução do Caixa). Pedido do Carlos: "quero
// visualizar o comportamento de caixa caindo na compra, crescendo, caindo de novo" — por isso é
// um card à parte do Fluxo de Caixa (Card 2, que mostra 5 séries) e do Saldo Devedor×Patrimônio
// (Card 3, que é sobre dívida/patrimônio): aqui é só uma série, área cheia, pra ler a "respiração"
// do caixa num piscar de olhos. ReferenceLine em 0 deixa óbvio se o caixa chega a ficar negativo.
export function EvolucaoDoCaixaChart({ meses }: { meses: MesSimulado[] }) {
  const dados = reamostrar(meses, 60).map((m) => ({
    mes: m.mes,
    Caixa: Math.round(m.caixaDisponivel),
  }));

  const menorSaldo = Math.min(...meses.map((m) => m.caixaDisponivel));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução do caixa</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dados} margin={{ left: 8, right: 16 }}>
            <defs>
              <linearGradient id="corCaixa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
            <XAxis dataKey="mes" tickFormatter={(v) => `M${v}`} fontSize={11} />
            <YAxis tickFormatter={(v) => formatMoeda(v)} fontSize={10} width={90} />
            <Tooltip formatter={(v) => formatMoeda(Number(v))} labelFormatter={(v) => `Mês ${v}`} />
            {menorSaldo < 0 && <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />}
            <Area type="monotone" dataKey="Caixa" stroke="#3b82f6" strokeWidth={2.5} fill="url(#corCaixa)" />
          </AreaChart>
        </ResponsiveContainer>
        {menorSaldo < 0 && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            O caixa fica negativo em algum ponto da simulação (mínimo de {formatMoeda(menorSaldo)}) — o cenário atual não é sustentável
            sem capital adicional ou ajuste nas premissas.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
