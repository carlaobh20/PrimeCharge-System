import { Link } from 'react-router-dom';
import {
  Wallet,
  AlertTriangle,
  Car,
  HeartPulse,
  ShieldAlert,
  FileText,
  CalendarClock,
  Users,
  IdCard,
  ListChecks,
  Zap,
  Store,
  Code,
  Building2,
  Boxes,
  Landmark,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { formatMoeda } from '@/shared/lib/format';
import { useEmpresaHealth } from '../hooks/useEmpresaHealth';
import { usePatrimonioEmpresa } from '../hooks/usePatrimonioEmpresa';
import { MetasPanel } from '../components/MetasPanel';
import { PatrimonioEmpresaCard } from '../components/PatrimonioEmpresaCard';

// Missão 5 (Fase 2 — Business Operating System) redesenha o papel desta página. Até aqui
// (DEC-024) era "exclusivamente analítico — tendência/histórico", em oposição ao Command
// Center ("decisão do dia a dia, item por item"). Isso continua verdade para o Command Center,
// mas manter o Dashboard como promessa vazia de gráficos de tendência não tinha nenhum
// consumidor real — não existe hoje nenhuma série histórica persistida (isso é Fase 6/Data
// Platform, propositalmente adiado). O pedido explícito desta sprint ("Dashboard Operacional
// ... Saúde da empresa ... Metas") tem um lugar natural que não compete com o Command Center:
// não é fila priorizada item-a-item (isso continua só na Home), é um placar agregado — "como
// está a empresa hoje" — mais Metas (que não são nem alerta nem ação, são alvo). Registrado
// como emenda à DEC-024 em DEC-110 (ver DECISION_LOG.md), não como revogação silenciosa.
export function DashboardPage() {
  const health = useEmpresaHealth();
  const patrimonio = usePatrimonioEmpresa();

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Saúde da Empresa</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Placar agregado da operação — para a fila de trabalho do dia (o que fazer agora, item por item), use a{' '}
          <Link to="/" className="underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300">
            Centro de Operações
          </Link>
          .
        </p>
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <Wallet className="h-3.5 w-3.5" />
          Saúde Financeira
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          <KpiCard
            icon={Wallet}
            label="Receita confirmada"
            value={health.isLoading ? '' : formatMoeda(health.financeiro.receitaConfirmada)}
            pending={health.isLoading}
          />
          <KpiCard
            icon={Wallet}
            label="Despesa confirmada"
            value={health.isLoading ? '' : formatMoeda(health.financeiro.despesaConfirmada)}
            pending={health.isLoading}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Pendentes atrasados"
            value={health.isLoading ? '' : `${health.financeiro.pagamentosPendentesAtrasados}`}
            hint={health.isLoading ? undefined : formatMoeda(health.financeiro.valorPendenteAtrasado)}
            pending={health.isLoading}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <Car className="h-3.5 w-3.5" />
          Saúde da Frota
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          <KpiCard icon={Car} label="Veículos" value={health.isLoading ? '' : `${health.frota.total}`} pending={health.isLoading} />
          <KpiCard
            icon={HeartPulse}
            label="Health médio"
            value={health.isLoading ? '' : (health.frota.healthMedio ?? '—').toString()}
            pending={health.isLoading}
          />
          <KpiCard
            icon={ShieldAlert}
            label="Veículos críticos"
            value={health.isLoading ? '' : `${health.frota.criticos}`}
            pending={health.isLoading}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <Landmark className="h-3.5 w-3.5" />
          Ativos
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          <KpiCard
            icon={Car}
            label="Veículos"
            value={health.isLoading ? '' : formatMoeda(health.ativos.valorTotalVeiculos)}
            pending={health.isLoading}
          />
          <KpiCard icon={Zap} label="Wallbox" value="" pending />
          <KpiCard icon={Store} label="Loja" value="" pending />
          <KpiCard icon={Code} label="Software" value="" pending />
          <KpiCard icon={Building2} label="Imóveis" value="" pending />
          <KpiCard icon={Boxes} label="Outros" value="" pending />
        </div>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <FileText className="h-3.5 w-3.5" />
          Saúde dos Contratos
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          <KpiCard
            icon={FileText}
            label="Contratos ativos"
            value={health.isLoading ? '' : `${health.contratos.ativos}`}
            hint={health.isLoading ? undefined : `${health.contratos.total} no total`}
            pending={health.isLoading}
          />
          <KpiCard
            icon={CalendarClock}
            label="Vencendo em 30 dias"
            value={health.isLoading ? '' : `${health.contratos.vencendoEm30Dias}`}
            pending={health.isLoading}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <Users className="h-3.5 w-3.5" />
          Saúde dos Motoristas
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          <KpiCard
            icon={Users}
            label="Motoristas ativos"
            value={health.isLoading ? '' : `${health.motoristas.ativos}`}
            hint={health.isLoading ? undefined : `${health.motoristas.total} no total`}
            pending={health.isLoading}
          />
          <KpiCard
            icon={IdCard}
            label="CNH vencendo em 30 dias"
            value={health.isLoading ? '' : `${health.motoristas.cnhVencendoEm30Dias}`}
            pending={health.isLoading}
          />
        </div>
      </section>

      <PatrimonioEmpresaCard patrimonio={patrimonio} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <ListChecks className="h-4 w-4 text-neutral-400" />
              Fila Operacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health.isLoading ? (
              <p className="text-sm text-neutral-500">Carregando…</p>
            ) : (
              <>
                <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {health.filaOperacional.total}
                </p>
                <p className="text-xs text-neutral-400">ações operacionais em aberto</p>
                <Link
                  to="/operacoes/acoes"
                  className="mt-3 inline-block text-xs text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
                >
                  Ver fila completa →
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <MetasPanel />
      </div>
    </div>
  );
}
