import { Card, CardContent } from '@/shared/components/ui/card';
import { Select } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';
import { formatMoeda } from '@/shared/lib/format';
import { formatarMoedaInput, digitosParaReais } from '@/shared/lib/moedaInput';
import { ESTRATEGIAS_AMORTIZACAO, LABEL_ESTRATEGIA_AMORTIZACAO, type CenarioSimulacaoInput, type EstrategiaAmortizacao } from '../types';
import { SEMANAS_POR_MES, type MesSimulado } from '../intelligence/simulacaoEmpresarial';

// 2026-08-10 (Prioridade 7 da missão "copiloto financeiro" — "vale amortizar" / "não vale
// amortizar") — compara duas taxas anualizadas, não valores em R$: (a) juros que deixam de ser
// pagos ao amortizar (taxa do financiamento × 12) contra (b) o retorno que o mesmo dinheiro
// renderia comprando mais um veículo (receita líquida anual do próximo carro ÷ custo total dele).
// Simplificação assumida (DEC-022): não considera composição nem o efeito de crescer a frota mês
// a mês (o motor principal já faz essa conta completa — isso aqui é uma comparação rápida de
// ORDEM DE GRANDEZA, pensada pra responder "essa direção faz sentido", não pra substituir a
// simulação).
function compararAmortizarVsComprar(valor: CenarioSimulacaoInput): { valeAmortizar: boolean; economiaAmortizarAaPct: number; retornoComprarAaPct: number } {
  const aluguelMensalPorVeiculo = valor.aluguel_esperado_semanal_por_veiculo * SEMANAS_POR_MES;
  const ocupacao = valor.ocupacao_esperada_pct / 100;
  const inadimplencia = valor.inadimplencia_esperada_pct / 100;
  const receitaLiquidaPorVeiculo =
    aluguelMensalPorVeiculo * ocupacao * (1 - inadimplencia) -
    (valor.seguro_mensal_por_veiculo +
      valor.ipva_anual_por_veiculo / 12 +
      valor.rastreador_mensal_por_veiculo +
      valor.lavagem_mensal_por_veiculo +
      valor.manutencao_mensal_por_veiculo +
      valor.licenciamento_anual_por_veiculo / 12);
  const custoTotalPorVeiculo = valor.valor_entrada_por_veiculo + valor.valor_financiado_por_veiculo;
  const retornoComprarAaPct = custoTotalPorVeiculo > 0 ? ((receitaLiquidaPorVeiculo * 12) / custoTotalPorVeiculo) * 100 : 0;
  const economiaAmortizarAaPct = valor.taxa_juros_am_pct * 12;
  return { valeAmortizar: economiaAmortizarAaPct >= retornoComprarAaPct, economiaAmortizarAaPct, retornoComprarAaPct };
}

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
  mesAtual,
}: {
  valor: CenarioSimulacaoInput;
  onChange: (patch: Partial<CenarioSimulacaoInput>) => void;
  mesAtual?: MesSimulado;
}) {
  const mostrarCampoValor = ESTRATEGIAS_COM_VALOR.includes(valor.amortizacao_estrategia);
  const comparacao = compararAmortizarVsComprar(valor);

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

        {mesAtual && valor.amortizacao_estrategia !== 'nunca' && (
          <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px] dark:border-white/5">
            <span className="text-neutral-500">Amortizado a mais até hoje</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMoeda(mesAtual.amortizacaoExtraAcumulada)}</span>
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
