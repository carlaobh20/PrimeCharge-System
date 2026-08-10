import { Fragment } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { formatMoeda } from '@/shared/lib/format';
import { formatarMoedaInput, digitosParaReais } from '../lib/moedaInput';
import { AmortizacaoCard } from './AmortizacaoCard';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';
import type { CenarioSimulacaoInput } from '../types';

type CampoNumerico = Exclude<keyof CenarioSimulacaoInput, 'nome' | 'reinvestir_lucro' | 'amortizacao_estrategia' | 'amortizacao_valor_manual'>;

// tipo do campo — controla o tipo de <input> renderizado (2026-08-10, pedido do Carlos: "ajuste
// os números que for valor em x.xxx,xx" + "quando for pra números inteiros, está mudando nos
// decimais"). 'moeda' = mascarado, mostra separador de milhar e 2 casas decimais no padrão BR.
// 'inteiro' = number com step 1 (não deixa a setinha do input nem o parse aceitarem fração —
// antes TODOS os campos usavam step="0.01", inclusive "Veículos iniciais"/"Prazo", que não fazem
// sentido fracionados). Sem `tipo` = comportamento antigo (number, step 0.01) — é o caso dos
// campos de percentual (juros, ocupação, inadimplência, depreciação), que continuam decimais de
// verdade e o Carlos não reclamou desses.
type TipoCampo = 'moeda' | 'inteiro';

type Grupo = { titulo: string; campos: { chave: CampoNumerico; label: string; sufixo?: string; tipo?: TipoCampo }[] };

// Extraído (2026-08-10) pra reusar nos campos "soltos" fora do loop de GRUPOS: a taxa de juros de
// investimento mora dentro do card Reinvestimento (que é hardcoded, tem o toggle Sim/Não) e os
// campos de Custos administrativos moram num card novo — duplicar a ramificação moeda/inteiro/
// decimal 3x violaria a mesma regra de "não duplicar" que já motivou extrair reamostrar/moedaInput.
function CampoInput({
  chave,
  valor,
  tipo,
  onChange,
}: {
  chave: CampoNumerico;
  valor: CenarioSimulacaoInput;
  tipo?: TipoCampo;
  onChange: (patch: Partial<CenarioSimulacaoInput>) => void;
}) {
  if (tipo === 'moeda') {
    return (
      <Input
        id={chave}
        type="text"
        inputMode="numeric"
        className="h-7 min-w-0 px-1.5 text-right text-xs"
        value={formatarMoedaInput(Number(valor[chave]) || 0)}
        onChange={(e) => onChange({ [chave]: digitosParaReais(e.target.value) } as Partial<CenarioSimulacaoInput>)}
      />
    );
  }
  if (tipo === 'inteiro') {
    return (
      <Input
        id={chave}
        type="number"
        step="1"
        inputMode="numeric"
        className="h-7 min-w-0 px-1.5 text-right text-xs"
        value={valor[chave] ?? ''}
        onChange={(e) => onChange({ [chave]: e.target.value === '' ? 0 : Math.round(Number(e.target.value)) } as Partial<CenarioSimulacaoInput>)}
      />
    );
  }
  return (
    <Input
      id={chave}
      type="number"
      step="0.01"
      inputMode="decimal"
      className="h-7 min-w-0 px-1.5 text-right text-xs"
      value={valor[chave] ?? ''}
      onChange={(e) => onChange({ [chave]: e.target.value === '' ? 0 : Number(e.target.value) } as Partial<CenarioSimulacaoInput>)}
    />
  );
}

const GRUPOS: Grupo[] = [
  {
    titulo: 'Capital',
    campos: [
      { chave: 'capital_disponivel', label: 'Capital disponível', sufixo: 'R$', tipo: 'moeda' },
      { chave: 'reserva_de_seguranca', label: 'Reserva de segurança', sufixo: 'R$', tipo: 'moeda' },
    ],
  },
  {
    titulo: 'Compra',
    campos: [
      { chave: 'veiculos_iniciais', label: 'Veículos iniciais', sufixo: 'un.', tipo: 'inteiro' },
      { chave: 'valor_entrada_por_veiculo', label: 'Entrada', sufixo: 'R$', tipo: 'moeda' },
      { chave: 'valor_financiado_por_veiculo', label: 'Valor financiado', sufixo: 'R$', tipo: 'moeda' },
      { chave: 'prazo_financiamento_meses', label: 'Prazo', sufixo: 'meses', tipo: 'inteiro' },
      { chave: 'taxa_juros_am_pct', label: 'Juros', sufixo: '% a.m.' },
    ],
  },
  {
    titulo: 'Receita',
    campos: [
      { chave: 'aluguel_esperado_semanal_por_veiculo', label: 'Aluguel semanal', sufixo: 'R$', tipo: 'moeda' },
      { chave: 'ocupacao_esperada_pct', label: 'Taxa de ocupação', sufixo: '%' },
      { chave: 'inadimplencia_esperada_pct', label: 'Inadimplência', sufixo: '%' },
    ],
  },
  {
    titulo: 'Custos (por veículo)',
    campos: [
      { chave: 'seguro_mensal_por_veiculo', label: 'Seguro', sufixo: 'R$/mês', tipo: 'moeda' },
      { chave: 'ipva_anual_por_veiculo', label: 'IPVA', sufixo: 'R$/ano', tipo: 'moeda' },
      { chave: 'rastreador_mensal_por_veiculo', label: 'Rastreador', sufixo: 'R$/mês', tipo: 'moeda' },
      { chave: 'lavagem_mensal_por_veiculo', label: 'Lavagem', sufixo: 'R$/mês', tipo: 'moeda' },
      { chave: 'manutencao_mensal_por_veiculo', label: 'Manutenção', sufixo: 'R$/mês', tipo: 'moeda' },
      { chave: 'depreciacao_am_pct', label: 'Depreciação', sufixo: '% a.m.' },
      { chave: 'licenciamento_anual_por_veiculo', label: 'Licenciamento', sufixo: 'R$/ano', tipo: 'moeda' },
    ],
  },
  {
    titulo: 'Crescimento',
    campos: [
      { chave: 'objetivo_veiculos', label: 'Objetivo', sufixo: 'veículos', tipo: 'inteiro' },
      { chave: 'prazo_desejado_meses', label: 'Prazo desejado', sufixo: 'meses', tipo: 'inteiro' },
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
  mesAtual,
}: {
  valor: CenarioSimulacaoInput;
  onChange: (patch: Partial<CenarioSimulacaoInput>) => void;
  mesAtual?: MesSimulado;
}) {
  return (
    <div className="min-w-0 columns-1 gap-3 sm:columns-2 lg:columns-3">
      {GRUPOS.map((grupo) => (
        <Fragment key={grupo.titulo}>
          <Card className="mb-3 break-inside-avoid">
            <CardContent className="py-2.5">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{grupo.titulo}</p>
              <div className="space-y-1.5">
                {grupo.campos.map(({ chave, label, sufixo, tipo }) => (
                  <div key={chave} className="flex items-center justify-between gap-2">
                    <Label htmlFor={chave} className="text-xs font-normal text-neutral-500">
                      {label}
                    </Label>
                    <div className="flex w-36 shrink-0 items-center gap-1">
                      <CampoInput chave={chave} valor={valor} tipo={tipo} onChange={onChange} />
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

          {/* 2026-08-10 — pedido do Carlos: Amortização entra logo abaixo do card "Compra"
              (Entrada/Financiado/Prazo/Juros), no HTML, pra cair na mesma coluna, logo em
              seguida, no CSS multi-column abaixo — é a próxima decisão sobre a mesma dívida. */}
          {grupo.titulo === 'Compra' && <AmortizacaoCard valor={valor} onChange={onChange} mesAtual={mesAtual} />}
        </Fragment>
      ))}

      <Card className="mb-3 break-inside-avoid">
        <CardContent className="py-2.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Reinvestimento</p>
          <div className="space-y-1.5">
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
            {/* 2026-08-10 — clarifica o que o toggle passou a controlar depois da correção do
                motor (auditoria "copiloto financeiro"): só o destino do LUCRO positivo. Prejuízo
                nunca foi opcional e agora o motor reflete isso sempre, com o toggle em qualquer
                posição. */}
            <p className="text-[10px] leading-snug text-neutral-400">
              Não: o lucro (quando positivo) sai da empresa todo mês, como se você retirasse — prejuízo sempre desconta do caixa, isso não muda.
            </p>
            {/* taxa_juros_investimento_aa_pct (2026-08-10, pedido do Carlos: "em reinvestimento,
                precisamos colocar a taxa de juros anual, dai vc calcula por mes o juros do
                dinheiro aplicado"). Fica aqui e não no card Capital porque é sobre o que
                ACONTECE com o caixa parado, mesmo assunto do toggle Sim/Não acima — os dois
                controlam "o que fazer com o dinheiro que sobra". Rende independente do toggle: o
                caixa que já está na conta ganha juros de qualquer forma, reinvestir_lucro só
                decide se o LUCRO NOVO do mês entra nessa conta ou não. */}
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="taxa_juros_investimento_aa_pct" className="text-xs font-normal text-neutral-500">
                Juros do caixa aplicado
              </Label>
              <div className="flex w-36 shrink-0 items-center gap-1">
                <CampoInput chave="taxa_juros_investimento_aa_pct" valor={valor} onChange={onChange} />
                <span className="w-10 shrink-0 text-[10px] text-neutral-400">% a.a.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custos administrativos (2026-08-10, pedido do Carlos: "abaixo do reinvestimento...
          abertura de empresa, contador, IR da operação"). Card novo, logo depois do
          Reinvestimento no HTML — em CSS multi-column isso normalmente cai na mesma coluna,
          logo abaixo (masonry preenche coluna por coluna, na ordem do documento). */}
      <Card className="mb-3 break-inside-avoid">
        <CardContent className="py-2.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Custos administrativos</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="custo_abertura_empresa" className="text-xs font-normal text-neutral-500">
                Abertura de empresa
              </Label>
              <div className="flex w-36 shrink-0 items-center gap-1">
                <CampoInput chave="custo_abertura_empresa" valor={valor} tipo="moeda" onChange={onChange} />
                <span className="w-10 shrink-0 text-[10px] text-neutral-400">R$</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="contador_mensal" className="text-xs font-normal text-neutral-500">
                Contador
              </Label>
              <div className="flex w-36 shrink-0 items-center gap-1">
                <CampoInput chave="contador_mensal" valor={valor} tipo="moeda" onChange={onChange} />
                <span className="w-10 shrink-0 text-[10px] text-neutral-400">R$/mês</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="taxa_ir_pct" className="text-xs font-normal text-neutral-500">
                IR da operação
              </Label>
              <div className="flex w-36 shrink-0 items-center gap-1">
                <CampoInput chave="taxa_ir_pct" valor={valor} onChange={onChange} />
                <span className="w-10 shrink-0 text-[10px] text-neutral-400">%</span>
              </div>
            </div>
          </div>
          <p className="mt-2 border-t border-neutral-100 pt-2 text-[11px] text-neutral-500 dark:border-white/5">
            Abertura é descontada uma vez, no início. Contador e IR entram todo mês — o IR incide sobre o lucro do mês (se for positivo).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
