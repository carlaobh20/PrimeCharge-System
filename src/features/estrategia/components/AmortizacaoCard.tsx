import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Select } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { formatMoeda } from '@/shared/lib/format';
import { ESTRATEGIAS_AMORTIZACAO, LABEL_ESTRATEGIA_AMORTIZACAO, type CenarioSimulacaoInput, type EstrategiaAmortizacao } from '../types';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

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
// real (quanto já foi amortizado a mais até o mês atual). Fica no lado direito, junto dos outros
// cards de resultado, porque é conceitualmente "mais uma alavanca de decisão", não uma premissa
// estrutural do cenário (por isso não foi pro PainelDePremissas à esquerda).
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Amortização</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1 block text-xs font-normal text-neutral-500">Estratégia</Label>
            <Select
              value={valor.amortizacao_estrategia}
              onChange={(e) => onChange({ amortizacao_estrategia: e.target.value as EstrategiaAmortizacao })}
              className="h-9 text-sm"
            >
              {ESTRATEGIAS_AMORTIZACAO.map((e) => (
                <option key={e} value={e}>
                  {LABEL_ESTRATEGIA_AMORTIZACAO[e]}
                </option>
              ))}
            </Select>
          </div>

          {mostrarCampoValor && (
            <div>
              <Label className="mb-1 block text-xs font-normal text-neutral-500">Valor por evento (R$)</Label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                className="h-9 text-sm"
                value={valor.amortizacao_valor_manual ?? ''}
                onChange={(e) => onChange({ amortizacao_valor_manual: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </div>
          )}
        </div>

        <p className="text-xs text-neutral-500">{DICA_POR_ESTRATEGIA[valor.amortizacao_estrategia]}</p>

        {mesAtual && valor.amortizacao_estrategia !== 'nunca' && (
          <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-white/[0.03]">
            <span className="text-neutral-500">Amortizado a mais até hoje</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMoeda(mesAtual.amortizacaoExtraAcumulada)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
