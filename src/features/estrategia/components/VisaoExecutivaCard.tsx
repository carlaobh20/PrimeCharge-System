import { Wallet, TrendingUp, TrendingDown, PiggyBank, Landmark, Coins, Building2, Gauge, Clock, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { formatMoeda } from '@/shared/lib/format';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

function formatPct(valor: number | null): string {
  return valor === null ? '—' : `${valor.toFixed(1)}%`;
}

type NivelDeRisco = 'baixo' | 'medio' | 'alto';

function calcularNivelDeRisco(mes: MesSimulado, alavancagemMaximaPct: number | null): { nivel: NivelDeRisco; motivo: string } {
  const alavancagemPct = mes.valorTotalFrota > 0 ? (mes.saldoDevedorTotal / mes.valorTotalFrota) * 100 : 0;

  if (alavancagemMaximaPct !== null) {
    if (alavancagemPct >= alavancagemMaximaPct) return { nivel: 'alto', motivo: `alavancagem de ${alavancagemPct.toFixed(0)}% já no limite da sua política (${alavancagemMaximaPct}%)` };
    if (alavancagemPct >= alavancagemMaximaPct * 0.8) return { nivel: 'medio', motivo: `alavancagem de ${alavancagemPct.toFixed(0)}% se aproximando do limite da política (${alavancagemMaximaPct}%)` };
    return { nivel: 'baixo', motivo: `alavancagem de ${alavancagemPct.toFixed(0)}%, dentro da política` };
  }

  // Sem política de alavancagem definida — heurística genérica (não baseada numa regra sua).
  if (alavancagemPct >= 70) return { nivel: 'alto', motivo: `alavancagem de ${alavancagemPct.toFixed(0)}% (sem política definida — heurística genérica)` };
  if (alavancagemPct >= 40) return { nivel: 'medio', motivo: `alavancagem de ${alavancagemPct.toFixed(0)}% (sem política definida — heurística genérica)` };
  return { nivel: 'baixo', motivo: `alavancagem de ${alavancagemPct.toFixed(0)}% (sem política definida — heurística genérica)` };
}

const LABEL_RISCO: Record<NivelDeRisco, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };

// Épico 3 — Central de Decisão Empresarial, Card 1 (Visão Executiva). Números do mês 0 ("hoje",
// o estado do plano no ponto de partida) — não a projeção final. Payback = capital investido ÷
// lucro mensal do mês 0, uma estimativa simples (não é o payback real do motor de investimento
// de frota/intelligence, que usa lucro acumulado real — aqui é projeção, não dado real).
export function VisaoExecutivaCard({ mesAtual, alavancagemMaximaPct }: { mesAtual: MesSimulado; alavancagemMaximaPct: number | null }) {
  const payback = mesAtual.lucroMensal > 0 ? Math.round(mesAtual.capitalInvestidoAcumulado / mesAtual.lucroMensal) : null;
  const risco = calcularNivelDeRisco(mesAtual, alavancagemMaximaPct);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão executiva</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard icon={Wallet} label="Fluxo livre mensal" value={formatMoeda(mesAtual.fluxoLivreMensal)} hint="variação real do caixa no mês" />
          <KpiCard icon={mesAtual.lucroMensal >= 0 ? TrendingUp : TrendingDown} label="Lucro líquido" value={formatMoeda(mesAtual.lucroMensal)} />
          <KpiCard icon={Gauge} label="ROI acumulado" value={formatPct(mesAtual.roiAcumuladoPct)} />
          <KpiCard icon={Clock} label="Payback estimado" value={payback === null ? '—' : `${payback} meses`} />
          <KpiCard icon={Landmark} label="Capital investido" value={formatMoeda(mesAtual.capitalInvestidoAcumulado)} />
          <KpiCard icon={Coins} label="Capital livre" value={formatMoeda(mesAtual.caixaDisponivel)} />
          <KpiCard icon={PiggyBank} label="Capital empatado" value={formatMoeda(mesAtual.patrimonioLiquido)} hint="imobilizado nos veículos" />
          <KpiCard icon={Building2} label="Patrimônio atual" value={formatMoeda(mesAtual.patrimonioLiquido)} />
          <KpiCard icon={TrendingUp} label="Valor da empresa" value={formatMoeda(mesAtual.valorDaEmpresa)} hint="caixa + patrimônio líquido" />
          <KpiCard icon={ShieldAlert} label="Nível de risco" value={LABEL_RISCO[risco.nivel]} hint={risco.motivo} />
        </div>
      </CardContent>
    </Card>
  );
}
