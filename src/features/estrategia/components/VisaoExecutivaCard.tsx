import { Wallet, TrendingUp, TrendingDown, PiggyBank, Landmark, Coins, Building2, Gauge, Clock, ShieldAlert, Percent } from 'lucide-react';
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
//
// 2026-08-10 — pedido do Carlos: "legenda simples pra leigo entender cada quadrado" + "quero o
// percentual do lucro líquido sobre o capital empatado, porque é o que realmente saiu do meu
// bolso". Duas mudanças:
// 1. Toda KpiCard ganhou `hint` em linguagem simples (algumas já tinham, a maioria não tinha).
// 2. Nova KpiCard "Retorno s/ capital empatado" = lucroMensal ÷ patrimonioLiquido — DIFERENTE de
//    "ROI acumulado" (que divide o lucro ACUMULADO pelo capital investido TOTAL, incluindo a
//    parte financiada pelo banco — por isso é sempre bem menor). Este novo número é só do mês, só
//    sobre o que é realmente seu (patrimônio líquido = valor do carro − o que ainda se deve).
//
// Achado colateral corrigido: "Patrimônio atual" e "Capital empatado" mostravam o MESMO número
// (os dois liam patrimonioLiquido) — provável bug de copy-paste, não duplicação proposital (duas
// caixas com valor idêntico e nomes diferentes é exatamente o tipo de coisa que confunde quem não
// é da área, o oposto do que foi pedido agora). "Patrimônio atual" passou a mostrar
// valorTotalFrota (quanto os carros valem hoje, ANTES de descontar a dívida) — complementa
// "Capital empatado" (o que sobra DEPOIS de descontar a dívida), em vez de repetir o mesmo valor.
export function VisaoExecutivaCard({ mesAtual, alavancagemMaximaPct }: { mesAtual: MesSimulado; alavancagemMaximaPct: number | null }) {
  const payback = mesAtual.lucroMensal > 0 ? Math.round(mesAtual.capitalInvestidoAcumulado / mesAtual.lucroMensal) : null;
  const risco = calcularNivelDeRisco(mesAtual, alavancagemMaximaPct);
  const retornoSobreCapitalEmpatadoPct = mesAtual.patrimonioLiquido > 0 ? (mesAtual.lucroMensal / mesAtual.patrimonioLiquido) * 100 : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão executiva</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            icon={Wallet}
            label="Fluxo livre mensal"
            value={formatMoeda(mesAtual.fluxoLivreMensal)}
            hint="quanto o caixa mudou neste mês (comprar um carro faz cair, o lucro do mês faz subir)"
          />
          <KpiCard
            icon={mesAtual.lucroMensal >= 0 ? TrendingUp : TrendingDown}
            label="Lucro líquido"
            value={formatMoeda(mesAtual.lucroMensal)}
            hint="o que sobrou neste mês depois de pagar despesas, parcela do financiamento e imposto"
          />
          <KpiCard
            icon={Gauge}
            label="ROI acumulado"
            value={formatPct(mesAtual.roiAcumuladoPct)}
            hint="retorno acumulado sobre TODO o valor já investido nos carros, incluindo a parte financiada pelo banco"
          />
          <KpiCard
            icon={Clock}
            label="Payback estimado"
            value={payback === null ? '—' : `${payback} meses`}
            hint="em quantos meses o lucro de hoje pagaria de volta tudo que já foi investido nos carros"
          />
          <KpiCard
            icon={Landmark}
            label="Capital investido"
            value={formatMoeda(mesAtual.capitalInvestidoAcumulado)}
            hint="valor total dos carros comprados até agora: sua entrada + o que o banco financiou"
          />
          <KpiCard
            icon={Coins}
            label="Capital livre"
            value={formatMoeda(mesAtual.caixaDisponivel)}
            hint="dinheiro em caixa agora, disponível pra comprar outro carro ou cobrir uma emergência"
          />
          <KpiCard
            icon={PiggyBank}
            label="Capital empatado"
            value={formatMoeda(mesAtual.patrimonioLiquido)}
            hint="o que já é realmente seu nos carros (valor do carro menos o que ainda se deve ao banco) — é o dinheiro que saiu do seu bolso"
          />
          <KpiCard
            icon={Percent}
            label="Retorno s/ capital empatado"
            value={formatPct(retornoSobreCapitalEmpatadoPct)}
            hint="o lucro deste mês dividido pelo capital empatado — o retorno real sobre o que saiu do seu bolso (diferente do ROI acumulado, que dilui com o dinheiro do banco)"
          />
          <KpiCard
            icon={Building2}
            label="Patrimônio atual"
            value={formatMoeda(mesAtual.valorTotalFrota)}
            hint="quanto os carros valem hoje, ANTES de descontar o que ainda se deve ao banco"
          />
          <KpiCard
            icon={TrendingUp}
            label="Valor da empresa"
            value={formatMoeda(mesAtual.valorDaEmpresa)}
            hint="caixa livre + patrimônio líquido — uma estimativa simples de quanto a empresa vale hoje"
          />
          <KpiCard icon={ShieldAlert} label="Nível de risco" value={LABEL_RISCO[risco.nivel]} hint={risco.motivo} />
        </div>
      </CardContent>
    </Card>
  );
}
