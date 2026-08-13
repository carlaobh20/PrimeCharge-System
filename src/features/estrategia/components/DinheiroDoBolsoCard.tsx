import { Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

// Épico 3 — Central de Decisão Empresarial, "Dinheiro do Bolso" (2026-08-10, Prioridade 3 da
// missão do Carlos: "quanto dinheiro do proprietário ainda está preso na operação?"). Mesma
// matemática do "Payback estimado" (Card 1) — capitalInvestidoAcumulado e lucroAcumulado — só que
// como barra de progresso em vez de "N meses": responde a MESMA pergunta em dois formatos, porque
// "faltam 61 meses" e "36% recuperado, faltam R$74.000" comunicam a mesma coisa de jeitos
// diferentes, e cada leitor entende um melhor.
//
// Fase 4.1 (2026-08-13) — capitalRecuperado/capitalAindaEmpatado/pctRecuperado deixaram de ser
// calculados aqui dentro (violava a regra "toda métrica financeira nasce no motor"); agora só
// formatam capitalRecuperadoAcumulado/capitalAindaAEmpatado/percentualRecuperadoPct, que
// `simularCrescimentoEmpresarial` já calcula. Definição completa (lucro acumulado travado em
// [0, capital investido]) documentada no comentário do campo em MesSimulado
// (simulacaoEmpresarial.ts).
export function DinheiroDoBolsoCard({ mesAtual }: { mesAtual: MesSimulado }) {
  if (mesAtual.capitalRecuperadoAcumulado === null) return null;

  // O motor garante que os três campos abaixo são null juntos (mesma condição:
  // capitalInvestidoAcumulado > 0) — o `?? 0` é só pra satisfazer o TypeScript depois do early
  // return acima, nunca deve de fato cair no fallback.
  const capitalInvestido = mesAtual.capitalInvestidoAcumulado;
  const capitalRecuperado = mesAtual.capitalRecuperadoAcumulado ?? 0;
  const capitalAindaEmpatado = mesAtual.capitalAindaAEmpatado ?? 0;
  const pctRecuperado = mesAtual.percentualRecuperadoPct ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-neutral-400" />
          Dinheiro do bolso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Quanto do que você já colocou nos carros ainda não voltou pro seu bolso.</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Capital investido</p>
            <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{formatMoeda(capitalInvestido)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Capital recuperado</p>
            <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatMoeda(capitalRecuperado)} <span className="text-sm font-normal text-neutral-400">({pctRecuperado.toFixed(0)}%)</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Ainda faltam</p>
            <p className="text-xl font-semibold text-amber-600 dark:text-amber-400">{formatMoeda(capitalAindaEmpatado)}</p>
          </div>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(100, pctRecuperado)}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}
