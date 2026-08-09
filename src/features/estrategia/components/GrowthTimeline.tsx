import { TrendingUp, Rocket } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { formatMoeda } from '@/shared/lib/format';
import { extrairMensagemTecnicaDeErro } from '@/shared/lib/errors';
import { useGrowthTimeline } from '../hooks/useGrowthTimeline';

function Valor({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-neutral-400">—</span>;
  return <span>{formatMoeda(valor)}</span>;
}

// Épico 3, Missão 1 — Timeline de Crescimento. Ver comentário completo em
// intelligence/growthTimeline.ts sobre o que é (projeção por unidade econômica real) e o que
// deliberadamente NÃO é ainda (o simulador completo com financiamento/funcionários/
// infraestrutura/tecnologia/riscos — isso é Épico 3, Fase 7).
export function GrowthTimeline() {
  const resultado = useGrowthTimeline();

  if (resultado.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 cockpit-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  if (resultado.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        Não consegui calcular a Timeline de Crescimento.
        <br />
        Detalhe técnico: {extrairMensagemTecnicaDeErro(resultado.error)}
      </div>
    );
  }

  const { timeline } = resultado;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Rocket className="h-4 w-4 text-neutral-400" />
          Timeline de crescimento — hoje ({timeline.frotaAtual} veículo{timeline.frotaAtual === 1 ? '' : 's'}) até 1000 veículos
        </CardTitle>
        <p className="text-xs text-neutral-500">
          Cada marco assume que o próximo veículo se comporta como a média real dos que você já tem hoje — não é uma promessa,
          é uma extrapolação da sua própria operação.
        </p>
      </CardHeader>
      <CardContent>
        {timeline.motivoSemProjecao ? (
          <EmptyState
            icon={TrendingUp}
            title="Ainda sem base pra projetar"
            description={timeline.motivoSemProjecao}
          />
        ) : (
          <>
            <p className="mb-3 text-xs text-neutral-500">
              Média calculada sobre {timeline.tamanhoDaAmostra} veículo{timeline.tamanhoDaAmostra === 1 ? '' : 's'} com valor de
              compra e histórico de operação.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10">
                    <th className="py-2 pr-3">Marco</th>
                    <th className="px-3 py-2">Capital necessário</th>
                    <th className="px-3 py-2">Receita mensal</th>
                    <th className="px-3 py-2">Despesa mensal</th>
                    <th className="px-3 py-2">Lucro mensal</th>
                    <th className="px-3 py-2">Financiamento máx. (política)</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.estagios.map((estagio) => (
                    <tr key={estagio.veiculos} className="border-b border-neutral-100 dark:border-white/5">
                      <td className="py-2.5 pr-3 font-medium text-neutral-800 dark:text-neutral-200">
                        <div className="flex items-center gap-2">
                          {estagio.veiculos} veículo{estagio.veiculos === 1 ? '' : 's'}
                          {estagio.jaAlcancado && (
                            <Badge variant="success" className="text-[10px]">
                              já alcançado
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Valor valor={estagio.capitalNecessario} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Valor valor={estagio.receitaMensalProjetada} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Valor valor={estagio.despesaMensalProjetada} />
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={
                            estagio.lucroMensalProjetado !== null && estagio.lucroMensalProjetado >= 0
                              ? 'font-semibold text-emerald-600'
                              : 'font-semibold text-red-600'
                          }
                        >
                          <Valor valor={estagio.lucroMensalProjetado} />
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Valor valor={estagio.financiamentoMaximoPermitido} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              Ainda não calculado por marco (sem base de dado real hoje): funcionários necessários, infraestrutura, tecnologia
              e fluxo de caixa com timing de recebíveis. Isso entra na Simulação Empresarial (próxima fase do Épico 3).
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
