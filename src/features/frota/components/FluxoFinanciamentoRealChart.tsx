import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import { formatMoeda } from '@/shared/lib/format';
import type { ResumoFinanciamentoReal } from '../intelligence/financiamentoReal';

// Épico 4 — "Ativo Financeiro", Parte 2. Mesmo padrão visual de SaldoDevedorPatrimonioChart
// (estrategia/) — reaproveitado aqui pro financiamento REAL de um veículo, não o cenário
// hipotético da empresa inteira.
//
// Só 3 linhas, não 4: "Patrimônio líquido" pedido na missão não vira uma 4ª linha do gráfico
// porque exigiria saber quanto o veículo valia em CADA mês passado — isso não é rastreado
// (só existe o valor atual). Inventar uma curva de depreciação pra preencher os meses
// anteriores violaria a mesma regra de honestidade de dado que já vale pro resto do Épico 4.
// Patrimônio líquido aparece como número único (valor atual − saldo devedor atual), ao lado do
// gráfico, não como curva.
export function FluxoFinanciamentoRealChart({ resumo }: { resumo: ResumoFinanciamentoReal }) {
  let jurosAcumulado = 0;
  let amortizacaoAcumulada = 0;
  const dados = resumo.tabela.map((l) => {
    jurosAcumulado += l.juros;
    amortizacaoAcumulada += l.amortizacao;
    return {
      mes: l.mes,
      'Saldo devedor': Math.round(l.saldoDevedor),
      'Juros pagos (acum.)': Math.round(jurosAcumulado),
      'Amortização (acum.)': Math.round(amortizacaoAcumulada),
    };
  });

  const mesHoje = Math.max(1, resumo.mesesDecorridos);
  const pontoHoje = dados[mesHoje - 1] ?? dados[dados.length - 1];

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={dados} margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
          <XAxis dataKey="mes" tickFormatter={(v) => `M${v}`} fontSize={11} />
          <YAxis tickFormatter={(v) => formatMoeda(v)} fontSize={10} width={90} />
          <Tooltip formatter={(v) => formatMoeda(Number(v))} labelFormatter={(v) => `Mês ${v}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="Saldo devedor" stroke="#ef4444" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="Juros pagos (acum.)" stroke="#f59e0b" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="Amortização (acum.)" stroke="#10b981" dot={false} strokeWidth={2} />
          {/* Sempre montado, nunca condicional — mesmo motivo do ReferenceDot em
              SaldoDevedorPatrimonioChart (evita o "insertBefore" do Recharts). */}
          <ReferenceDot x={pontoHoje?.mes ?? 1} y={pontoHoje?.['Saldo devedor'] ?? 0} r={5} fill="#3b82f6" stroke="white" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
