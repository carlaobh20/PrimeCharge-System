import { CheckCircle2, CircleDashed } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import type { ComparacaoMomentoCompra } from '../intelligence/momentoDeCompra';

const ROTULO_ESPERA: Record<number, string> = { 0: 'Comprar agora', 3: 'Esperar 3 meses', 6: 'Esperar 6 meses' };

// Épico 3 — Central de Decisão Empresarial, Card 10 (Momento Ideal para Comprar o Próximo
// Veículo). Nas palavras do Carlos: "Esta talvez seja a informação mais importante". O método
// completo (o que é comparado, o que fica fixo, o horizonte usado) está documentado em
// intelligence/momentoDeCompra.ts — vale ler antes de levar esse card pra um banco/investidor.
export function MomentoIdealDeCompraCard({ comparacao }: { comparacao: ComparacaoMomentoCompra }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Momento ideal para comprar o próximo veículo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {comparacao.opcoes.map((o) => {
            const melhor = comparacao.melhorOpcaoMesesDeEspera === o.mesesDeEspera;
            return (
              <div
                key={o.mesesDeEspera}
                className={cn(
                  'rounded-xl border p-3',
                  melhor ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-neutral-200 dark:border-white/10'
                )}
              >
                <div className="flex items-center gap-1.5">
                  {melhor ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <CircleDashed className="h-3.5 w-3.5 text-neutral-300" />
                  )}
                  <span className={cn('text-xs font-semibold', melhor && 'text-emerald-700 dark:text-emerald-400')}>
                    {ROTULO_ESPERA[o.mesesDeEspera]}
                  </span>
                  {melhor && (
                    <span className="ml-auto rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                      Melhor momento
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-neutral-400">
                  {o.podeComprarNoMomento ? 'Caixa suficiente pra entrada' : 'Caixa insuficiente pra entrada'}
                </p>
                <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatMoeda(o.patrimonioLiquidoNoHorizonte)}
                </p>
                <p className="text-[10px] text-neutral-400">patrimônio líquido em {comparacao.horizonteMeses} meses</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500">{comparacao.justificativa}</p>
      </CardContent>
    </Card>
  );
}
