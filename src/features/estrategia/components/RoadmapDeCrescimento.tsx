import { Check, CircleDot, Circle, AlertTriangle, PartyPopper, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { formatMoeda } from '@/shared/lib/format';
import { extrairMensagemTecnicaDeErro } from '@/shared/lib/errors';
import { useSimulacaoResultado } from '../hooks/useSimulacaoResultado';
import type { MarcoSimulado, MesSimulado } from '../intelligence/simulacaoEmpresarial';

function labelDoMes(mes: number | null): string {
  if (mes === null) return 'fora do prazo simulado';
  if (mes <= 0) return 'Hoje';
  if (mes < 12) return `Mês ${mes}`;
  const anos = Math.floor(mes / 12);
  const restoMeses = mes % 12;
  return restoMeses === 0 ? `${anos} ano${anos > 1 ? 's' : ''}` : `${anos}a ${restoMeses}m`;
}

function corDoStatus(status: MarcoSimulado['status']) {
  if (status === 'concluido') return { dot: 'bg-emerald-500 text-white', text: 'text-neutral-800 dark:text-neutral-200', linha: 'border-emerald-300 dark:border-emerald-800' };
  if (status === 'proximo') return { dot: 'bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-900/40', text: 'text-neutral-900 font-semibold dark:text-neutral-100', linha: 'border-neutral-200 dark:border-neutral-800' };
  return { dot: 'bg-neutral-200 text-neutral-400 dark:bg-neutral-800', text: 'text-neutral-400 dark:text-neutral-600', linha: 'border-neutral-200 dark:border-neutral-800' };
}

function ItemMarco({ item, mesInfo }: { item: MarcoSimulado; mesInfo: MesSimulado | undefined }) {
  const cor = corDoStatus(item.status);
  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cor.dot}`}>
          {item.status === 'concluido' ? <Check className="h-4 w-4" /> : item.status === 'proximo' ? <CircleDot className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        </span>
        <span className={`mt-1 w-px flex-1 border-l ${cor.linha}`} />
      </div>
      <div className="pb-1">
        <p className={`text-sm ${cor.text}`}>{item.marco.nome}</p>
        <p className="text-xs text-neutral-400">{labelDoMes(item.mesAlcancado)}</p>
        {mesInfo && item.status !== 'futuro' && (
          <p className="mt-0.5 text-xs text-neutral-500">
            {mesInfo.frota} veículo{mesInfo.frota === 1 ? '' : 's'} · lucro do mês {formatMoeda(mesInfo.lucroMensal)}
          </p>
        )}
      </div>
    </div>
  );
}

// Épico 3 — Simulação Empresarial. Roadmap visual: a "história" que qualquer pessoa (investidor,
// banco, sócio, esposa) deve entender em menos de 2 minutos sem saber nada de finanças. Cores
// pedidas explicitamente pelo Carlos: verde = já alcançado (dentro do próprio cenário simulado),
// destacado = próxima etapa, cinza = futuro. Marcos manuais NUNCA entram nesta linha do tempo
// cronológica — não têm mês projetável de forma honesta, ficam numa lista separada abaixo.
export function RoadmapDeCrescimento() {
  const resultado = useSimulacaoResultado();

  if (resultado.isLoading) {
    return <div className="h-64 cockpit-shimmer rounded-2xl" />;
  }

  if (resultado.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        Não consegui simular o crescimento.
        <br />
        Detalhe técnico: {extrairMensagemTecnicaDeErro(resultado.error)}
      </div>
    );
  }

  if (!resultado.cenario || !resultado.resultado) {
    return (
      <EmptyState
        icon={PartyPopper}
        title="Nenhum cenário simulado ainda"
        description="Preencha o formulário acima e clique em Simular para ver a história do crescimento da PrimeCharge."
      />
    );
  }

  const { resultado: r } = resultado;
  const mesPorNumero = new Map(r.meses.map((m) => [m.mes, m]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roadmap de crescimento</CardTitle>
      </CardHeader>
      <CardContent>
        {r.avisoCapitalInicialInsuficiente && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            O capital disponível não cobriu a entrada de todos os veículos iniciais pedidos — a simulação comprou só o que o
            caixa permitiu no início.
          </div>
        )}

        <div
          className={`mb-5 flex items-center gap-2 rounded-lg p-3 text-sm ${
            r.objetivoAlcancadoNoMes !== null
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
              : 'bg-neutral-50 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
          }`}
        >
          {r.objetivoAlcancadoNoMes !== null ? (
            <>
              <PartyPopper className="h-4 w-4 shrink-0" />
              Objetivo alcançado em {labelDoMes(r.objetivoAlcancadoNoMes)}.
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4 shrink-0" />
              No ritmo deste cenário, o objetivo não é alcançado dentro do prazo desejado — a frota chega a {r.frotaFinal}{' '}
              veículo{r.frotaFinal === 1 ? '' : 's'}.
            </>
          )}
        </div>

        {r.marcosAutomaticos.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="Nenhum marco cadastrado"
            description="Adicione marcos de crescimento acima (contratar funcionário, abrir lojinha...) para eles aparecerem aqui."
          />
        ) : (
          <div>
            {r.marcosAutomaticos.map((item) => (
              <ItemMarco key={item.marco.id} item={item} mesInfo={item.mesAlcancado !== null ? mesPorNumero.get(item.mesAlcancado) : undefined} />
            ))}
          </div>
        )}

        {r.marcosManuais.length > 0 && (
          <div className="mt-6 border-t border-neutral-100 pt-4 dark:border-white/5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">Marcos que você mesmo confirma</p>
            <div className="space-y-1.5">
              {r.marcosManuais.map((item) => (
                <div key={item.marco.id} className="flex items-center gap-2 text-sm">
                  {item.status === 'concluido' ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-neutral-300" />
                  )}
                  <span className={item.status === 'concluido' ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400'}>
                    {item.marco.nome}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
