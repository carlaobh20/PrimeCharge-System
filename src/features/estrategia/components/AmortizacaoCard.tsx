import { Card, CardContent } from '@/shared/components/ui/card';
import { Select } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';
import { formatMoeda } from '@/shared/lib/format';
import { formatarMoedaInput, digitosParaReais } from '@/shared/lib/moedaInput';
import { ESTRATEGIAS_AMORTIZACAO, LABEL_ESTRATEGIA_AMORTIZACAO, type CenarioSimulacaoInput, type EstrategiaAmortizacao } from '../types';
import type { ComparacaoAmortizarVsComprar, ResumoAmortizacaoExtra } from '../intelligence/simulacaoEmpresarial';

const ESTRATEGIAS_COM_VALOR: EstrategiaAmortizacao[] = ['todo_mes', 'a_cada_6_meses', 'manual'];

const DICA_POR_ESTRATEGIA: Record<EstrategiaAmortizacao, string> = {
  nunca: 'Só a parcela normal do financiamento — nenhum pagamento extra.',
  quando_sobrar_caixa: 'Depois que a frota atinge o objetivo de veículos, todo caixa parado vira amortização — em vez de acumular sem uso.',
  todo_mes: 'O valor abaixo é descontado todo mês, a partir do mês 1, além da parcela normal.',
  a_cada_6_meses: 'O valor abaixo é descontado a cada 6 meses (mês 6, 12, 18…), além da parcela normal.',
  manual: 'O valor abaixo é descontado uma única vez, no mês 1 — um aporte extraordinário pontual.',
};

// Épico 3 — Central de Decisão Empresarial, Card 4 (Amortização). É controle (muda a estratégia
// = recalcula tudo, sem botão Simular, igual todo o resto do painel) e mostra o efeito em tempo
// real (quanto já foi amortizado a mais até o mês atual).
//
// 2026-08-10 — pedido do Carlos: mudou de lugar. Antes ficava no lado direito, junto dos cards de
// resultado (grid com Evolução do Caixa); agora entra dentro do PainelDePremissas, logo abaixo do
// card "Compra" (Entrada/Financiado/Prazo/Juros) — é literalmente a próxima decisão sobre a mesma
// dívida, então fica junto no mesmo lugar em que se mexe no financiamento. Estilo compactado pra
// ficar uniforme com os outros cards do painel (mesmo padding, mesma altura de input, mesmo
// tamanho de texto) — deixou de ter CardHeader/CardTitle próprio porque nenhum card do painel
// tem, só um rótulo pequeno em maiúsculas dentro do CardContent.
export function AmortizacaoCard({
  valor,
  onChange,
  resumo,
  comparacao,
}: {
  valor: CenarioSimulacaoInput;
  onChange: (patch: Partial<CenarioSimulacaoInput>) => void;
  /** Fase amortização (2026-08-14) — resumo do horizonte calculado no motor
   * (resumirAmortizacaoExtra): configurado por evento, total efetivamente aplicado, e se em algum
   * mês o caixa/saldo limitou o valor. Substitui o antigo `mesAtual` (que era o mês 0 e por isso
   * mostrava sempre R$ 0,00 em "amortizado até hoje"). */
  resumo?: ResumoAmortizacaoExtra;
  /** Fase 4.1 (2026-08-13) — calculado no motor (calcularComparacaoAmortizarVsComprar), nunca
   * mais aqui dentro. O componente só formata e apresenta. */
  comparacao: ComparacaoAmortizarVsComprar;
}) {
  const mostrarCampoValor = ESTRATEGIAS_COM_VALOR.includes(valor.amortizacao_estrategia);

  return (
    <Card className="mb-3 break-inside-avoid">
      <CardContent className="py-2.5">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Amortização</p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-normal text-neutral-500">Estratégia</Label>
            <div className="w-36 shrink-0">
              <Select
                value={valor.amortizacao_estrategia}
                onChange={(e) => onChange({ amortizacao_estrategia: e.target.value as EstrategiaAmortizacao })}
                className="h-7 px-1.5 text-xs"
              >
                {ESTRATEGIAS_AMORTIZACAO.map((e) => (
                  <option key={e} value={e}>
                    {LABEL_ESTRATEGIA_AMORTIZACAO[e]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {mostrarCampoValor && (
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-normal text-neutral-500">Valor por evento</Label>
              <div className="flex w-36 shrink-0 items-center gap-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  className="h-7 min-w-0 px-1.5 text-right text-xs"
                  value={formatarMoedaInput(valor.amortizacao_valor_manual ?? 0)}
                  onChange={(e) => onChange({ amortizacao_valor_manual: digitosParaReais(e.target.value) })}
                />
                <span className="w-10 shrink-0 text-[10px] text-neutral-400">R$</span>
              </div>
            </div>
          )}
        </div>

        <p className="mt-2 text-[11px] leading-snug text-neutral-400">{DICA_POR_ESTRATEGIA[valor.amortizacao_estrategia]}</p>

        {resumo && valor.amortizacao_estrategia !== 'nunca' && (
          <div className="mt-2 space-y-1 border-t border-neutral-100 pt-2 text-[11px] dark:border-white/5">
            {mostrarCampoValor && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Configurado por evento</span>
                <span className="font-medium text-neutral-600 dark:text-neutral-300">{formatMoeda(resumo.configuradoPorEvento)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Total efetivamente amortizado</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMoeda(resumo.totalAplicado)}</span>
            </div>
            {resumo.algumMesLimitadoPorCaixa && (
              <p className="text-[10px] leading-snug text-amber-600 dark:text-amber-400">
                Em alguns meses o valor aplicado ficou abaixo do configurado — o caixa ou o saldo devedor disponível limitou o pagamento (o
                sistema nunca deixa o caixa negativo nem a dívida abaixo de zero).
              </p>
            )}
          </div>
        )}

        <div
          className={cn(
            'mt-2 rounded-md px-2 py-1.5 text-[11px] leading-snug',
            comparacao.valeAmortizar ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
          )}
        >
          <span className="font-semibold">{comparacao.valeAmortizar ? 'Vale mais amortizar. ' : 'Vale mais comprar outro carro. '}</span>
          Amortizar economiza ~{comparacao.economiaAmortizarAaPct.toFixed(1)}% a.a. de juros; comprar mais um veículo rende ~{comparacao.retornoComprarAaPct.toFixed(1)}% a.a. sobre o valor do carro.
        </div>
      </CardContent>
    </Card>
  );
}
