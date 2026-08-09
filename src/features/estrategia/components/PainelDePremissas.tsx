import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import type { CenarioSimulacaoInput } from '../types';

type CampoNumerico = Exclude<keyof CenarioSimulacaoInput, 'nome' | 'reinvestir_lucro' | 'amortizacao_estrategia' | 'amortizacao_valor_manual'>;

type Grupo = { titulo: string; campos: { chave: CampoNumerico; label: string; sufixo?: string }[] };

const GRUPOS: Grupo[] = [
  {
    titulo: 'Capital',
    campos: [{ chave: 'capital_disponivel', label: 'Capital disponível', sufixo: 'R$' }],
  },
  {
    titulo: 'Compra',
    campos: [
      { chave: 'veiculos_iniciais', label: 'Veículos iniciais', sufixo: 'un.' },
      { chave: 'valor_entrada_por_veiculo', label: 'Entrada', sufixo: 'R$' },
      { chave: 'valor_financiado_por_veiculo', label: 'Valor financiado', sufixo: 'R$' },
      { chave: 'prazo_financiamento_meses', label: 'Prazo', sufixo: 'meses' },
      { chave: 'taxa_juros_am_pct', label: 'Juros', sufixo: '% a.m.' },
    ],
  },
  {
    titulo: 'Receita',
    campos: [
      { chave: 'aluguel_esperado_semanal_por_veiculo', label: 'Aluguel semanal', sufixo: 'R$' },
      { chave: 'ocupacao_esperada_pct', label: 'Taxa de ocupação', sufixo: '%' },
      { chave: 'inadimplencia_esperada_pct', label: 'Inadimplência', sufixo: '%' },
    ],
  },
  {
    titulo: 'Custos (por veículo)',
    campos: [
      { chave: 'seguro_mensal_por_veiculo', label: 'Seguro', sufixo: 'R$/mês' },
      { chave: 'ipva_anual_por_veiculo', label: 'IPVA', sufixo: 'R$/ano' },
      { chave: 'rastreador_mensal_por_veiculo', label: 'Rastreador', sufixo: 'R$/mês' },
      { chave: 'lavagem_mensal_por_veiculo', label: 'Lavagem', sufixo: 'R$/mês' },
      { chave: 'manutencao_mensal_por_veiculo', label: 'Manutenção', sufixo: 'R$/mês' },
      { chave: 'depreciacao_am_pct', label: 'Depreciação', sufixo: '% a.m.' },
      { chave: 'licenciamento_anual_por_veiculo', label: 'Licenciamento', sufixo: 'R$/ano' },
    ],
  },
  {
    titulo: 'Crescimento',
    campos: [
      { chave: 'objetivo_veiculos', label: 'Objetivo', sufixo: 'veículos' },
      { chave: 'prazo_desejado_meses', label: 'Prazo desejado', sufixo: 'meses' },
    ],
  },
];

// Épico 3 — Central de Decisão Empresarial. Premissas em cards compactos (pedido explícito:
// "não em formulário vertical"). Cada alteração dispara onChange imediatamente — quem chama
// decide o que fazer com isso (recalcular na hora + autosave debounced), não existe conceito de
// "submit" aqui.
export function PainelDePremissas({
  valor,
  onChange,
}: {
  valor: CenarioSimulacaoInput;
  onChange: (patch: Partial<CenarioSimulacaoInput>) => void;
}) {
  return (
    <div className="min-w-0 space-y-3">
      {GRUPOS.map((grupo) => (
        <Card key={grupo.titulo}>
          <CardContent className="py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{grupo.titulo}</p>
            <div className="space-y-2">
              {grupo.campos.map(({ chave, label, sufixo }) => (
                <div key={chave} className="flex items-center justify-between gap-2">
                  <Label htmlFor={chave} className="text-xs font-normal text-neutral-500">
                    {label}
                  </Label>
                  <div className="flex w-32 items-center gap-1">
                    <Input
                      id={chave}
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      className="h-7 px-2 text-right text-xs"
                      value={valor[chave] ?? ''}
                      onChange={(e) => onChange({ [chave]: e.target.value === '' ? 0 : Number(e.target.value) } as Partial<CenarioSimulacaoInput>)}
                    />
                    {sufixo && <span className="w-12 shrink-0 text-[10px] text-neutral-400">{sufixo}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Reinvestimento</p>
          <div className="flex items-center justify-between">
            <Label className="text-xs font-normal text-neutral-500">Reinvestir lucro?</Label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ reinvestir_lucro: true })}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${valor.reinvestir_lucro ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'}`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => onChange({ reinvestir_lucro: false })}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${!valor.reinvestir_lucro ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'}`}
              >
                Não
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
