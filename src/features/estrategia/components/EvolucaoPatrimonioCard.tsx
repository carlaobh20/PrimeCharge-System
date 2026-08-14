import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

// Épico 3 — Central de Decisão Empresarial, Card 7 (Evolução do Patrimônio). O Carlos pediu as
// mesmas 3 grandezas do Card 3 (valor do veículo / saldo financiado / patrimônio líquido) "mês a
// mês, com exemplo numérico" — decisão minha: em vez de repetir o gráfico de linha do Card 3
// (que já cobre "mês a mês" visualmente), este card entrega o "exemplo numérico" que o Card 3 não
// tem — 3 fotos da jornada (início, metade do prazo, fim) em linguagem direta, pensadas pra quem
// não lê gráfico financeiro. Se você preferir que os dois sejam idênticos (dois gráficos iguais),
// eu troco — é só avisar.
export function EvolucaoPatrimonioCard({ meses }: { meses: MesSimulado[] }) {
  if (meses.length === 0) return null;

  const inicio = meses[0];
  const fim = meses[meses.length - 1];
  const meio = meses[Math.floor((meses.length - 1) / 2)];
  const pontos = meio.mes !== inicio.mes && meio.mes !== fim.mes ? [inicio, meio, fim] : [inicio, fim];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução do patrimônio</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tailwind precisa de classes estáticas (não interpola bem em build) — grid-cols-2/3 escritas por extenso. */}
        <div className={`grid grid-cols-1 gap-3 ${pontos.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {pontos.map((m) => (
            <div key={m.mes} className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {m.mes === 0 ? 'Hoje' : `Mês ${m.mes}`}
              </span>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-400">Veículo(s) valem</dt>
                  <dd className="font-medium text-neutral-900 dark:text-neutral-100">{formatMoeda(m.valorTotalFrota)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-400">Ainda deve</dt>
                  <dd className="font-medium text-red-500">{formatMoeda(m.saldoDevedorTotal)}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-200 pt-1.5 dark:border-white/10">
                  <dt className="font-medium text-neutral-600 dark:text-neutral-300">Patrimônio líquido</dt>
                  <dd className={`font-semibold ${m.patrimonioLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {formatMoeda(m.patrimonioLiquido)}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Em resumo: {fim.patrimonioLiquido >= inicio.patrimonioLiquido ? 'o patrimônio líquido cresce' : 'o patrimônio líquido cai'} de{' '}
          {formatMoeda(inicio.patrimonioLiquido)} para {formatMoeda(fim.patrimonioLiquido)} ao longo do período simulado
          {inicio.patrimonioSobreCapitalInvestidoPct !== null &&
            ` — hoje o patrimônio já é ${inicio.patrimonioSobreCapitalInvestidoPct.toFixed(0)}% do total investido`}
          .
        </p>
      </CardContent>
    </Card>
  );
}
