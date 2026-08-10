import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { formatMoeda } from '@/shared/lib/format';
import type { CenarioSimulacaoInput } from '../types';

type CampoNumerico = Exclude<keyof CenarioSimulacaoInput, 'nome' | 'reinvestir_lucro' | 'amortizacao_estrategia' | 'amortizacao_valor_manual'>;

type Grupo = { titulo: string; campos: { chave: CampoNumerico; label: string; sufixo?: string }[] };

const GRUPOS: Grupo[] = [
  {
    titulo: 'Capital',
    campos: [
      { chave: 'capital_disponivel', label: 'Capital disponível', sufixo: 'R$' },
      { chave: 'reserva_de_seguranca', label: 'Reserva de segurança', sufixo: 'R$' },
    ],
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
//
// Layout mudou de coluna estreita (30% à esquerda) pra faixa larga no topo (pedido do Carlos,
// 2026-08-09: "premissas primeiro pra preencher, gráficos abaixo") — por isso os grupos viraram
// vários cards lado a lado em vez de empilhados verticalmente, senão a faixa larga ficaria com
// bastante espaço vazio à direita de cada card.
//
// grid-cols-3 + items-start (tentativa anterior, mesmo dia) resolvia o card esticar, mas criava
// um problema novo que o Carlos chamou de "buracos": em CSS Grid a ALTURA DA LINHA é sempre a do
// maior card daquela linha, então um card curto ("Capital", 1 campo) ficava numa célula alta
// (porque "Compra", vizinho de linha, tem 5 campos) e, mesmo sem esticar, deixava um vão vazio
// embaixo dele até o fim da célula — não tem como resolver isso com grid comum, é inerente ao
// jeito que grid distribui altura por linha.
// Troquei pra CSS multi-column (`columns-*`, o mesmo mecanismo de "jornal em colunas") — aqui
// cada card ocupa só a própria altura e o PRÓXIMO card da mesma coluna começa logo em seguida,
// sem esperar a linha toda "fechar". `break-inside-avoid` evita que o conteúdo de um card seja
// cortado ao meio entre duas colunas.
//
// reserva_de_seguranca + indicador "dá pra comprar N agora" (2026-08-10, pedido do Carlos:
// "o sistema tem que ser inteligente... deixe mais interativo"). Mesma conta que o motor de
// simulação usa pra liberar compra (simulacaoEmpresarial.ts): compra N veículos enquanto
// capital - N×entrada continuar >= reserva, ou seja N = floor((capital - reserva) / entrada).
// Fica no card Capital, direto abaixo dos dois campos que alimentam essa conta — não precisa
// olhar o gráfico/tabela lá embaixo pra saber "quantos dá pra comprar hoje", o número já
// aparece enquanto digita.
function calcularVeiculosDisponiveisAgora(valor: CenarioSimulacaoInput): number {
  if (valor.valor_entrada_por_veiculo <= 0) return 0;
  return Math.max(0, Math.floor((valor.capital_disponivel - valor.reserva_de_seguranca) / valor.valor_entrada_por_veiculo));
}

export function PainelDePremissas({
  valor,
  onChange,
}: {
  valor: CenarioSimulacaoInput;
  onChange: (patch: Partial<CenarioSimulacaoInput>) => void;
}) {
  return (
    <div className="min-w-0 columns-1 gap-3 sm:columns-2 lg:columns-3">
      {GRUPOS.map((grupo) => (
        <Card key={grupo.titulo} className="mb-3 break-inside-avoid">
          <CardContent className="py-2.5">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{grupo.titulo}</p>
            <div className="space-y-1.5">
              {grupo.campos.map(({ chave, label, sufixo }) => (
                <div key={chave} className="flex items-center justify-between gap-2">
                  <Label htmlFor={chave} className="text-xs font-normal text-neutral-500">
                    {label}
                  </Label>
                  <div className="flex w-36 shrink-0 items-center gap-1">
                    <Input
                      id={chave}
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      className="h-7 min-w-0 px-1.5 text-right text-xs"
                      value={valor[chave] ?? ''}
                      onChange={(e) => onChange({ [chave]: e.target.value === '' ? 0 : Number(e.target.value) } as Partial<CenarioSimulacaoInput>)}
                    />
                    {sufixo && <span className="w-10 shrink-0 text-[10px] text-neutral-400">{sufixo}</span>}
                  </div>
                </div>
              ))}
            </div>
            {grupo.titulo === 'Capital' && (
              <p className="mt-2 border-t border-neutral-100 pt-2 text-[11px] text-neutral-500 dark:border-white/5">
                {valor.capital_disponivel < valor.reserva_de_seguranca ? (
                  <span className="text-amber-600 dark:text-amber-400">Capital abaixo da reserva de segurança — nenhum veículo pode ser comprado agora.</span>
                ) : (
                  <>
                    Dá pra comprar{' '}
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {calcularVeiculosDisponiveisAgora(valor)} veículo(s)
                    </span>{' '}
                    agora, mantendo a reserva de {formatMoeda(valor.reserva_de_seguranca)}.
                  </>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      <Card className="mb-3 break-inside-avoid">
        <CardContent className="py-2.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Reinvestimento</p>
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
