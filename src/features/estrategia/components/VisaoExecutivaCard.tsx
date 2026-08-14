import { Wallet, TrendingUp, TrendingDown, PiggyBank, Landmark, Coins, Building2, Gauge, Clock, Percent } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { formatMoeda } from '@/shared/lib/format';
import type { MesSimulado, PaybackResultado } from '../intelligence/simulacaoEmpresarial';

function formatPct(valor: number | null): string {
  return valor === null ? '—' : `${valor.toFixed(1)}%`;
}

function formatPayback(payback: PaybackResultado): string {
  switch (payback.estado) {
    case 'recuperado':
      return `${payback.mes} meses`;
    case 'nao_recuperado':
      return 'Não recuperado no horizonte';
    case 'sem_capital':
      return '—';
  }
}

// Épico 3 — Central de Decisão Empresarial, Card 1 (Visão Executiva). Números do mês 0 ("hoje",
// o estado do plano no ponto de partida) — não a projeção final.
//
// 2026-08-13 — Auditoria "Simulador Financeiro — Visão Executiva": Payback e "Seu dinheiro rende
// (este mês)" deixaram de ser calculados aqui dentro (violava a regra "toda métrica financeira
// nasce no motor") — agora só formatam o que `simularCrescimentoEmpresarial` já calculou. "Nível
// de risco" foi removido por completo (pedido explícito), sem substituto. "Capital investido"
// (motor) agora é capital PRÓPRIO (entrada, nunca entrada+financiado) — ver simulacaoEmpresarial.ts.
//
// 2026-08-10 — pedido do Carlos: "legenda simples pra leigo entender cada quadrado" + "quero o
// percentual do lucro líquido sobre o capital empatado, porque é o que realmente saiu do meu
// bolso". Toda KpiCard tem `hint` em linguagem simples.
//
// Achado colateral corrigido (2026-08-10): "Patrimônio atual" e "Capital empatado" mostravam o
// MESMO número (os dois liam patrimonioLiquido) — "Patrimônio atual" passou a mostrar
// valorTotalFrota (quanto os carros valem hoje, ANTES de descontar a dívida).
export function VisaoExecutivaCard({ mesAtual, payback }: { mesAtual: MesSimulado; payback: PaybackResultado }) {
  const semFrota = mesAtual.frota === 0;

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
            hint={semFrota ? 'nenhum veículo adquirido ainda — este número é só o rendimento do caixa parado, não lucro de operação' : 'quanto o caixa mudou neste mês (comprar um carro faz cair, o lucro do mês faz subir)'}
          />
          <KpiCard
            icon={mesAtual.lucroMensal >= 0 ? TrendingUp : TrendingDown}
            label="Lucro líquido"
            value={formatMoeda(mesAtual.lucroMensal)}
            hint={semFrota ? 'nenhum veículo adquirido ainda — este número é só o rendimento do caixa parado, não lucro de operação' : 'o que sobrou neste mês depois de pagar despesas, parcela do financiamento e imposto'}
          />
          <KpiCard
            icon={Gauge}
            label="Seu dinheiro rende (acumulado)"
            value={formatPct(mesAtual.roiAcumuladoPct)}
            hint="retorno acumulado sobre o capital PRÓPRIO investido nos carros (sua entrada — não conta a parte financiada pelo banco) — é o termo técnico 'ROI'"
          />
          <KpiCard
            icon={Clock}
            label="Tempo para recuperar o investimento"
            value={formatPayback(payback)}
            hint="em quantos meses o lucro acumulado alcança o capital próprio já investido — é o termo técnico 'payback'"
          />
          <KpiCard
            icon={Landmark}
            label="Capital investido"
            value={formatMoeda(mesAtual.capitalInvestidoAcumulado)}
            hint="capital PRÓPRIO colocado nos carros até agora (sua entrada) — não inclui o que o banco financiou"
          />
          <KpiCard
            icon={Coins}
            label="Capital livre"
            value={formatMoeda(mesAtual.caixaDisponivel)}
            hint="dinheiro em caixa agora, disponível pra comprar outro carro ou cobrir uma emergência"
          />
          <KpiCard
            icon={PiggyBank}
            label="Patrimônio nos veículos"
            value={semFrota ? 'Nenhum veículo adquirido' : formatMoeda(mesAtual.patrimonioLiquido)}
            hint="patrimônio líquido atualmente representado pelos veículos, após descontar a dívida — é o termo técnico 'equity'"
          />
          <KpiCard
            icon={Percent}
            label="Seu dinheiro rende (este mês)"
            value={formatPct(mesAtual.retornoMensalSobreCapitalPropioPct)}
            hint="o lucro deste mês dividido pelo capital PRÓPRIO investido (mesma base do acumulado ao lado, só que só deste mês)"
          />
          <KpiCard
            icon={Building2}
            label="Quanto os carros valem hoje"
            value={semFrota ? 'Nenhum veículo adquirido' : formatMoeda(mesAtual.valorTotalFrota)}
            hint="valor total da frota, ANTES de descontar o que ainda se deve ao banco"
          />
          <KpiCard
            icon={TrendingUp}
            label="Valor da empresa"
            value={formatMoeda(mesAtual.valorDaEmpresa)}
            hint="caixa livre + patrimônio líquido — uma estimativa simples de quanto a empresa vale hoje"
          />
        </div>
      </CardContent>
    </Card>
  );
}
