import { cn } from '@/shared/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

const NOMES_MES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function rotuloMes(indice: number): string {
  // mês 0 = ponto de partida ("hoje"), não janeiro — só a partir do mês 1 o rótulo vira
  // um mês do calendário civil, contando a partir de "daqui a 1 mês".
  if (indice === 0) return 'Hoje';
  return `${NOMES_MES[(indice - 1) % 12]}${indice > 12 ? ` (ano ${Math.ceil(indice / 12)})` : ''}`;
}

// Épico 3 — Central de Decisão Empresarial, Card 5 (Linha do Tempo). Pedido do Carlos: "Janeiro:
// Recebeu/Pagou/Lucrou/Saldo → Fevereiro → ... visual" — não é gráfico, é uma linha do tempo
// horizontal de cartões, um por mês, pensada pra alguém sem letramento financeiro rolar e
// entender a história mês a mês (o mesmo público do resto do módulo: banco/investidor/esposa).
// Mostra todos os meses (sem reamostrar — aqui cada mês é uma "cena" da história, downsample
// destruiria isso), com scroll horizontal.
export function LinhaDoTempo({ meses }: { meses: MesSimulado[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha do tempo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {meses.map((m) => (
            <div
              key={m.mes}
              className="flex w-[168px] flex-shrink-0 flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{rotuloMes(m.mes)}</span>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Recebeu</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatMoeda(m.receitaMensal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Pagou</span>
                  <span className="font-medium text-red-500">{formatMoeda(m.despesaMensal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Lucrou</span>
                  <span className={cn('font-medium', m.lucroMensal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                    {formatMoeda(m.lucroMensal)}
                  </span>
                </div>
              </div>
              <div className="mt-1 border-t border-neutral-200 pt-2 dark:border-white/10">
                <span className="text-[10px] uppercase tracking-wide text-neutral-400">Saldo em caixa</span>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{formatMoeda(m.caixaDisponivel)}</p>
              </div>
              {m.frota > 0 && <span className="text-[10px] text-neutral-400">{m.frota} veículo(s) na frota</span>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
