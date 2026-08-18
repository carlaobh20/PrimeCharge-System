import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  FileSignature,
  FileStack,
  FileText,
  Plus,
  Scale,
  Timer,
} from 'lucide-react';
import { KpiCard } from '@/shared/components/ui/kpi-card';
import { buttonVariants } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { formatDataSimples } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { usePanoramaJuridico, type PendenciaJuridica } from '../hooks';

// Dashboard Jurídico (regras 2 e 3): TODOS os números derivam do banco (usePanoramaJuridico —
// contratos + versões + assinaturas + aditivos em lote); nada inventado. A fila "Precisa de
// atenção" ordena por prioridade e cada item leva direto pro contrato.

const COR_FILA: Record<PendenciaJuridica['cor'], string> = {
  vermelho: 'bg-red-500',
  laranja: 'bg-orange-500',
  amarelo: 'bg-amber-400',
  azul: 'bg-blue-500',
};

export function JuridicoDashboardPage() {
  const { panorama, isLoading, isError } = usePanoramaJuridico();

  if (isLoading) return <div className="p-8 text-sm text-neutral-500">Carregando o panorama jurídico…</div>;
  if (isError) return <div className="p-8 text-sm text-red-600">Não foi possível carregar o panorama. Recarregue a página.</div>;

  const { cards, fila, vencimentos } = panorama;

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            <Scale className="h-6 w-6 text-emerald-600" /> Jurídico
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Ciclo de vida dos contratos: documento, versões, assinaturas, aditivos e prazos.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/juridico/templates" className={buttonVariants({ variant: 'outline' })}>
            <FileStack className="h-4 w-4" /> Templates
          </Link>
          <Link to="/juridico/contratos" className={buttonVariants({ variant: 'outline' })}>
            <FileText className="h-4 w-4" /> Contratos
          </Link>
          <Link to="/juridico/contratos/novo" className={buttonVariants({})}>
            <Plus className="h-4 w-4" /> Novo contrato
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard icon={CheckCircle2} label="Contratos ativos" value={String(cards.ativos)} />
        <KpiCard icon={FilePlus2} label="Rascunhos" value={String(cards.rascunhos)} hint="versão em elaboração" />
        <KpiCard icon={FileText} label="Em revisão" value={String(cards.emRevisao)} />
        <KpiCard icon={FileSignature} label="Aguardando assinatura" value={String(cards.aguardandoAssinatura)} />
        <KpiCard icon={CheckCircle2} label="Assinados/Vigentes" value={String(cards.assinados)} />
        <KpiCard icon={CalendarClock} label="Vencendo (30d)" value={String(cards.vencendo)} />
        <KpiCard icon={Timer} label="Vencidos" value={String(cards.vencidos)} />
        <KpiCard icon={FileStack} label="Aditivos pendentes" value={String(cards.aditivosPendentes)} />
        <KpiCard icon={Scale} label="Rescisões" value={String(cards.rescisoes)} hint="aditivos de rescisão" />
        <KpiCard icon={AlertTriangle} label="Pendências" value={String(cards.pendencias)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Precisa de atenção</h2>
          {fila.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Tudo em dia" description="Nenhuma pendência jurídica no momento." />
          ) : (
            <div className="space-y-2">
              {fila.map((item, i) => (
                <Link
                  key={`${item.contratoId}-${item.rotulo}-${i}`}
                  to={`/juridico/contratos/${item.contratoId}`}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', COR_FILA[item.cor])} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{item.rotulo}</p>
                    <p className="truncate text-xs text-neutral-500">{item.detalhe}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-emerald-600">Abrir →</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Próximos do vencimento</h2>
          {vencimentos.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nada vencendo" description="Nenhum contrato ativo vence nos próximos 30 dias." />
          ) : (
            <div className="space-y-2">
              {vencimentos.map(({ contrato, diasRestantes }) => (
                <Link
                  key={contrato.id}
                  to={`/juridico/contratos/${contrato.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-4 py-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {contrato.motorista?.nome_completo ?? '—'}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {contrato.veiculo?.placa} · fim {contrato.data_fim_prevista ? formatDataSimples(contrato.data_fim_prevista) : '—'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                      diasRestantes < 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                    )}
                  >
                    {diasRestantes < 0 ? `vencido há ${Math.abs(diasRestantes)}d` : `${diasRestantes}d`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
