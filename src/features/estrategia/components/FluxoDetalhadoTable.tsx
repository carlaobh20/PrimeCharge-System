import { cn } from '@/shared/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import { agruparFluxoPorAno } from '../intelligence/fluxoAnual';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

// Épico 3 — Central de Decisão Empresarial, Fluxo Detalhado. Pedido do Carlos: "quero o fluxo
// detalhado listado também, antes do gráfico — entrada, despesas, dívida amortização, saldo da
// dívida, lucro líquido, ano a ano". Fica logo acima do gráfico de Fluxo de Caixa (Card 2) — quem
// quer o número exato lê a tabela, quem quer a tendência olha o gráfico logo abaixo.
export function FluxoDetalhadoTable({ meses }: { meses: MesSimulado[] }) {
  const anos = agruparFluxoPorAno(meses);
  const hoje = meses.find((m) => m.mes === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo detalhado — ano a ano</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-white/10">
              <th className="py-2 pr-3 font-medium">Período</th>
              <th className="py-2 pr-3 text-right font-medium">Entrada</th>
              <th className="py-2 pr-3 text-right font-medium">Despesas</th>
              <th className="py-2 pr-3 text-right font-medium">Amortização da dívida</th>
              <th className="py-2 pr-3 text-right font-medium">Saldo da dívida</th>
              <th className="py-2 pr-3 text-right font-medium">Lucro líquido</th>
            </tr>
          </thead>
          <tbody>
            {hoje && (
              <tr className="border-b border-neutral-100 text-neutral-400 dark:border-white/5">
                <td className="py-2 pr-3 font-medium">Hoje</td>
                <td className="py-2 pr-3 text-right">—</td>
                <td className="py-2 pr-3 text-right">—</td>
                <td className="py-2 pr-3 text-right">—</td>
                <td className="py-2 pr-3 text-right">{formatMoeda(hoje.saldoDevedorTotal)}</td>
                <td className="py-2 pr-3 text-right">—</td>
              </tr>
            )}
            {anos.map((ano) => (
              <tr key={ano.rotulo} className="border-b border-neutral-100 dark:border-white/5">
                <td className="py-2 pr-3 font-medium text-neutral-700 dark:text-neutral-300">{ano.rotulo}</td>
                <td className="py-2 pr-3 text-right text-emerald-600 dark:text-emerald-400">{formatMoeda(ano.entrada)}</td>
                <td className="py-2 pr-3 text-right text-red-500">{formatMoeda(ano.despesas)}</td>
                <td className="py-2 pr-3 text-right text-neutral-600 dark:text-neutral-300">{formatMoeda(ano.amortizacaoDaDivida)}</td>
                <td className="py-2 pr-3 text-right text-neutral-600 dark:text-neutral-300">{formatMoeda(ano.saldoDaDivida)}</td>
                <td
                  className={cn(
                    'py-2 pr-3 text-right font-semibold',
                    ano.lucroLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                  )}
                >
                  {formatMoeda(ano.lucroLiquido)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-neutral-400">
          "Despesas" é só custo operacional (seguro, IPVA, rastreador, lavagem, manutenção, licenciamento) — a parcela do financiamento
          entra separada, em "Amortização da dívida" (o que reduziu o principal) e nos juros embutidos no lucro líquido.
        </p>
      </CardContent>
    </Card>
  );
}
