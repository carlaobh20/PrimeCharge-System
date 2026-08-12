import { useMemo, useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Drawer } from '@/shared/components/ui/drawer';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { SeloOrigemDado } from '@/shared/components/ui/selo-dado';
import { formatMoeda } from '@/shared/lib/format';
import { formatarMoedaInput, digitosParaReais } from '@/shared/lib/moedaInput';
import { compararMomentosDeVenda, type CenarioDecisaoVenda, type ResultadoMomentoDeVenda } from '../intelligence/comparadorMomentosDeVenda';
import { decomporMomentoDeVenda, type DecomposicaoVenda } from '../intelligence/analiseDecisaoVenda';
import type { CenarioExpansaoInput } from '../types';

// Épico 10 — "Inteligência de Renovação", Fase 3 (2026-08-12). Interface executiva pra "QUANDO EU
// DEVO VENDER?". Consome, SEM RECALCULAR, os motores já validados da Fase 1 (63/63,
// comparadorMomentosDeVenda.ts) e Fase 2 (65/65, analiseDecisaoVenda.ts) — esta tela não calcula
// parcela, saldo devedor, equity, DSCR, patrimônio ou capital reciclado; só formata e apresenta o
// que essas funções já retornam.
//
// DECISÃO REGISTRADA #1 (não pedida linha a linha — necessária pra não duplicar premissa na
// tela): o cenário usado aqui é o MESMO `input` (card "Premissas do próximo veículo", já editável
// acima nesta mesma tela) — não um segundo cenário hardcoded. Evita a inconsistência de "preço do
// veículo" ter dois valores diferentes na mesma página. Um único campo é exclusivo desta seção:
// "Valor de venda estimado" — não existe campo genérico equivalente em `CenarioExpansaoInput`
// (o candidato mais próximo, `venda_valor_estimado`, está acoplado à "venda programada" de
// Épico 9/Fase 2, um recurso diferente) — por isso este campo vive em estado local, não
// persistido (Fase 3, item 28 do brief: "sem migration"), pré-preenchido de
// `venda_valor_estimado` quando existir, senão de `preco_veiculo`, sempre editável e rotulado
// como PREMISSA.
//
// DECISÃO REGISTRADA #2 (escopo): só o motor de 1 geração (Fase 1/2) alimenta esta tela.
// `cicloDeVenda.ts` (multiciclo geração 1→2, com trava de DSCR) fica FORA por ora — ver nota no
// card "Por que" abaixo. Motivo: os dois motores têm estruturas de cenário e regras de trava
// diferentes (o comparador de 1 geração não trava por DSCR, só por reserva mínima); misturar os
// dois na mesma tela arriscava mostrar dois números de "patrimônio final" inconsistentes entre
// si pro mesmo mês. Sem um caso de uso concreto pedido pra essa combinação ainda (Regra dos 3),
// a escolha mais honesta é não modelar DSCR aqui e dizer isso explicitamente, em vez de inventar
// um número ou misturar motores silenciosamente.

const CANDIDATOS_MESES_PASSO = 3;
const MAX_CANDIDATOS = 12;

function construirCenarioDecisaoVenda(input: CenarioExpansaoInput, valorVenda: number): CenarioDecisaoVenda {
  return {
    precoVeiculo: input.preco_veiculo,
    entrada: input.entrada_por_veiculo,
    taxaJurosAmPct: input.taxa_juros_am_pct,
    prazoFinanciamentoMeses: input.prazo_financiamento_meses,
    sistemaAmortizacao: input.sistema_amortizacao,
    aluguelSemanalPorVeiculo: input.aluguel_semanal_por_veiculo,
    ocupacaoPct: input.ocupacao_pct,
    seguroMensalPorVeiculo: input.seguro_mensal_por_veiculo,
    ipvaAnualPorVeiculo: input.ipva_anual_por_veiculo,
    rastreadorMensalPorVeiculo: input.rastreador_mensal_por_veiculo,
    manutencaoPorKm: input.manutencao_por_km,
    kmMensal: input.km_mensal_por_veiculo,
    reservaMinima: input.reserva_minima,
    valorVenda,
    vendaCustosPct: input.venda_custos_pct,
    horizonteMeses: input.horizonte_meses,
  };
}

function gerarCandidatos(horizonteMeses: number): number[] {
  const candidatos: number[] = [];
  for (let m = CANDIDATOS_MESES_PASSO; m < horizonteMeses && candidatos.length < MAX_CANDIDATOS; m += CANDIDATOS_MESES_PASSO) {
    candidatos.push(m);
  }
  return candidatos;
}

const rotulo = (mes: number | null) => (mes === null ? 'Manter' : `M${mes}`);

type PontoGraficoDecisao = {
  label: string;
  mesVenda: number | null;
  patrimonio: number;
  capitalReciclado: number;
  frota: number;
  caixa: number;
  equity: number;
  divida: number;
  compras: number;
  isMelhor: boolean;
};

export function IntelligenciaDeRenovacao({ input }: { input: CenarioExpansaoInput }) {
  const [valorVenda, setValorVenda] = useState<number>(input.venda_valor_estimado ?? input.preco_veiculo);
  const [mesDetalhe, setMesDetalhe] = useState<number | null | undefined>(undefined);

  const cenario = useMemo(() => construirCenarioDecisaoVenda(input, valorVenda), [input, valorVenda]);
  const candidatos = useMemo(() => gerarCandidatos(input.horizonte_meses), [input.horizonte_meses]);

  let comparacao: ReturnType<typeof compararMomentosDeVenda> | null = null;
  let erro: string | null = null;
  try {
    comparacao = compararMomentosDeVenda(cenario, candidatos);
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  return (
    <>
      <Card className="border-2 border-emerald-200 dark:border-emerald-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Inteligência de Renovação <SeloOrigemDado origem="projecao" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="space-y-1">
              <Label htmlFor="valorVendaEstimadoRenovacao" className="flex items-center gap-1.5 text-xs text-neutral-500">
                Valor de venda estimado <SeloOrigemDado origem="premissa" />
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400">R$</span>
                <Input
                  id="valorVendaEstimadoRenovacao"
                  type="text"
                  inputMode="numeric"
                  className="h-8 w-40 pl-7 text-right text-sm"
                  value={formatarMoedaInput(valorVenda)}
                  onChange={(e) => setValorVenda(digitosParaReais(e.target.value))}
                />
              </div>
            </div>
            <p className="max-w-md text-xs text-neutral-500">
              Premissa fixa (nunca FIPE/mercado/IA — DEC-022). Todas as simulações abaixo usam este valor pra qualquer mês de venda testado. Não é salvo no cenário — só afeta esta seção.
            </p>
          </div>

          {erro || !comparacao ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              Não consegui simular os momentos de venda com as premissas atuais.
              {erro && (
                <>
                  <br />
                  Detalhe técnico: {erro}
                </>
              )}
            </div>
          ) : (
            <ConteudoInteligencia
              cenario={cenario}
              comparacao={comparacao}
              mesDetalhe={mesDetalhe}
              onSelecionarDetalhe={setMesDetalhe}
            />
          )}
        </CardContent>
      </Card>

      {comparacao && (
        <DrawerDetalhe
          cenario={cenario}
          comparacao={comparacao}
          mesDetalhe={mesDetalhe}
          onOpenChange={(open) => !open && setMesDetalhe(undefined)}
        />
      )}
    </>
  );
}

function ConteudoInteligencia({
  cenario,
  comparacao,
  onSelecionarDetalhe,
}: {
  cenario: CenarioDecisaoVenda;
  comparacao: ReturnType<typeof compararMomentosDeVenda>;
  mesDetalhe: number | null | undefined;
  onSelecionarDetalhe: (mes: number | null) => void;
}) {
  const melhor = comparacao.porMomento.find((r) => r.mesVenda === comparacao.melhorMesVenda)!;
  const manter = comparacao.porMomento.find((r) => r.mesVenda === null)!;
  const vantagem = melhor.patrimonioFinalNoHorizonte - manter.patrimonioFinalNoHorizonte;
  const decomposicaoMelhor = melhor.mesVenda !== null ? decomporMomentoDeVenda(cenario, melhor.mesVenda) : null;

  const dadosGrafico: PontoGraficoDecisao[] = comparacao.porMomento
    .slice()
    .sort((a, b) => (a.mesVenda ?? Infinity) - (b.mesVenda ?? Infinity))
    .map((r) => ({
      label: rotulo(r.mesVenda),
      mesVenda: r.mesVenda,
      patrimonio: Math.round(r.patrimonioFinalNoHorizonte),
      capitalReciclado: Math.round(r.capitalReciclado),
      frota: r.frotaFinalUnidades,
      caixa: Math.round(r.caixaFinal),
      equity: Math.round(r.equityFinal),
      divida: Math.round(r.meses[r.meses.length - 1].saldoDevedor),
      compras: r.eventos.filter((e) => e.tipo === 'reinvestimento').length,
      isMelhor: r.mesVenda === comparacao.melhorMesVenda,
    }));

  return (
    <>
      {/* Seção 5 — Hero da decisão */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-5 dark:from-emerald-950/30 dark:to-transparent">
        <Badge variant="success">MELHOR DENTRO DAS PREMISSAS</Badge>
        <h2 className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {melhor.mesVenda !== null ? `VENDER NO MÊS ${melhor.mesVenda}` : 'MANTER O VEÍCULO (NÃO VENDER)'}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-neutral-500">Patrimônio final</p>
            <p className="text-lg font-semibold">{formatMoeda(melhor.patrimonioFinalNoHorizonte)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Horizonte</p>
            <p className="text-lg font-semibold">{cenario.horizonteMeses} meses</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Frota final</p>
            <p className="text-lg font-semibold">{melhor.frotaFinalUnidades} veículo(s)</p>
          </div>
        </div>
        {/* "Estratégia" (conservadora/balanceada/agressiva) é um conceito do Épico 9 — este motor
            (Épico 10, decisão de venda) não tem esse campo. Omitido de propósito: não inventamos
            um rótulo de estratégia que o motor não calcula. */}
      </div>

      {/* Seção 9 — vantagem */}
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
        <p className={`flex items-center gap-2 text-2xl font-bold ${vantagem >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {vantagem >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          {vantagem >= 0 ? '+' : '-'}
          {formatMoeda(Math.abs(vantagem))}
        </p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Dentro das premissas atuais, {melhor.mesVenda !== null ? `vender no mês ${melhor.mesVenda}` : 'manter o veículo'} gera {formatMoeda(Math.abs(vantagem))} {vantagem >= 0 ? 'a mais' : 'a menos'} de patrimônio no horizonte de {cenario.horizonteMeses} meses do que manter o veículo sem vender.
        </p>
      </div>

      {/* Seção 7 — Por que */}
      {decomposicaoMelhor && <PorQueCard cenario={cenario} decomposicao={decomposicaoMelhor} melhor={melhor} />}

      {/* Seção 8 — lado a lado (só faz sentido quando a melhor decisão é vender — quando é
          "manter", melhor === manter e a comparação seria contra si mesma). */}
      {melhor.mesVenda !== null && <ComparacaoLadoALado melhor={melhor} manter={manter} />}

      {/* Seção 10 */}
      <GraficoBarrasDecisao titulo="Patrimônio final por momento de venda" dados={dadosGrafico} campo="patrimonio" corPadrao="#0ea5e9" corMelhor="#10b981" />

      {/* Seção 11 */}
      <div>
        <GraficoBarrasDecisao titulo="Capital reciclado por momento" dados={dadosGrafico} campo="capitalReciclado" corPadrao="#8b5cf6" corMelhor="#10b981" />
        <p className="mt-1 px-1 text-xs text-neutral-500">
          Isso NÃO é patrimônio — é o caixa líquido que a venda libera (valor de venda − saldo devedor − custos de venda). Só vira patrimônio de fato se, e na medida em que, financiar novos veículos.
        </p>
      </div>

      {/* Seção 12 */}
      <GraficoBarrasDecisao titulo="Frota final por alternativa" dados={dadosGrafico} campo="frota" corPadrao="#6366f1" corMelhor="#10b981" formatador={(v) => `${v}`} />

      {/* Seção 13/14 */}
      <TabelaDecisoes dados={dadosGrafico} melhorMes={comparacao.melhorMesVenda} onSelecionar={onSelecionarDetalhe} />
    </>
  );
}

function PorQueCard({
  cenario,
  decomposicao,
  melhor,
}: {
  cenario: CenarioDecisaoVenda;
  decomposicao: DecomposicaoVenda;
  melhor: ResultadoMomentoDeVenda;
}) {
  // "Equity antes da venda" lido direto de meses[].equity do motor (não recalculado como
  // precoVeiculo − saldoDevedor aqui) — item 2 do brief: "a UI não deve calcular... equity".
  // Mesma convenção de `decomporMomentoDeVenda` pro mês 0 (nada rodou antes, equity antes = 0).
  const equityAntes = decomposicao.mesVenda === 0 ? 0 : melhor.meses[decomposicao.mesVenda - 1].equity;
  const capitalUtilizado = melhor.capitalRecicladoUsadoEmNovaAquisicao;
  // capitalReciclado e capitalRecicladoUsadoEmNovaAquisicao já são campos do motor — a subtração
  // abaixo é só apresentação (mostrar o "resto" dos dois totais), não uma nova regra financeira.
  const capitalOcioso = Math.max(0, melhor.capitalReciclado - capitalUtilizado);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Por que mês {decomposicao.mesVenda}?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <GrupoPorQue
            titulo="Antes da venda"
            itens={[
              ['Valor do veículo', formatMoeda(cenario.precoVeiculo)],
              ['Saldo devedor', formatMoeda(decomposicao.saldoDevedor)],
              ['Equity', formatMoeda(equityAntes)],
            ]}
          />
          <GrupoPorQue
            titulo="Na venda"
            itens={[
              ['Valor de venda', formatMoeda(decomposicao.valorVenda)],
              ['Saldo quitado', formatMoeda(decomposicao.saldoDevedor)],
              ['Capital líquido liberado', formatMoeda(decomposicao.capitalLiquido)],
            ]}
          />
          <GrupoPorQue
            titulo="Depois da venda"
            itens={[
              ['Capital utilizado', formatMoeda(capitalUtilizado)],
              ['Capital ocioso', formatMoeda(capitalOcioso)],
              ['Novos veículos', `${decomposicao.quantidadeNovosVeiculos}`],
            ]}
          />
        </div>
        <p className="flex items-start gap-1.5 text-xs text-neutral-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          DSCR não é uma trava neste motor (comparador de 1 geração, Fase 1/2) — só o motor multiciclo (`cicloDeVenda.ts`, geração 1→2) aplica DSCR, com uma estrutura de cenário diferente. Não misturado nesta tela pra não gerar dois números de patrimônio inconsistentes.
        </p>
      </CardContent>
    </Card>
  );
}

function GrupoPorQue({ titulo, itens }: { titulo: string; itens: [string, string][] }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{titulo}</p>
      <dl className="space-y-1.5 text-sm">
        {itens.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-neutral-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ComparacaoLadoALado({ melhor, manter }: { melhor: ResultadoMomentoDeVenda; manter: ResultadoMomentoDeVenda }) {
  const linhas: [string, (r: ResultadoMomentoDeVenda) => string][] = [
    ['Patrimônio', (r) => formatMoeda(r.patrimonioFinalNoHorizonte)],
    ['Frota', (r) => `${r.frotaFinalUnidades} veículo(s)`],
    ['Caixa', (r) => formatMoeda(r.caixaFinal)],
    ['Equity', (r) => formatMoeda(r.equityFinal)],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vender no mês {melhor.mesVenda} vs. não vender</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border-2 border-emerald-200 p-3 dark:border-emerald-900/50">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Vender M{melhor.mesVenda}</p>
          <dl className="space-y-1.5 text-sm">
            {linhas.map(([k, f]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="font-medium">{f(melhor)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Não vender</p>
          <dl className="space-y-1.5 text-sm">
            {linhas.map(([k, f]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="font-medium">{f(manter)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function GraficoBarrasDecisao({
  titulo,
  dados,
  campo,
  corPadrao,
  corMelhor,
  formatador,
}: {
  titulo: string;
  dados: PontoGraficoDecisao[];
  campo: 'patrimonio' | 'capitalReciclado' | 'frota';
  corPadrao: string;
  corMelhor: string;
  formatador?: (v: number) => string;
}) {
  const fmt = formatador ?? ((v: number) => formatMoeda(v));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dados} margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis fontSize={11} tickFormatter={fmt} width={90} />
            <Tooltip formatter={(v) => fmt(Number(v))} labelFormatter={(l) => `${l}`} />
            <Bar dataKey={campo} radius={[4, 4, 0, 0]}>
              {dados.map((d) => (
                <Cell key={d.label} fill={d.isMelhor ? corMelhor : corPadrao} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TabelaDecisoes({
  dados,
  melhorMes,
  onSelecionar,
}: {
  dados: PontoGraficoDecisao[];
  melhorMes: number | null;
  onSelecionar: (mes: number | null) => void;
}) {
  const [ordenarPorPatrimonio, setOrdenarPorPatrimonio] = useState(false);
  const linhas = ordenarPorPatrimonio ? [...dados].sort((a, b) => b.patrimonio - a.patrimonio) : dados;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Todas as alternativas</span>
          <button
            type="button"
            onClick={() => setOrdenarPorPatrimonio((v) => !v)}
            className="text-xs font-normal text-neutral-500 underline decoration-dotted hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            {ordenarPorPatrimonio ? 'Ordenar por mês' : 'Ordenar por patrimônio'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-white/10">
                <th className="py-2 pr-4">Decisão</th>
                <th className="py-2 pr-4">Patrimônio</th>
                <th className="py-2 pr-4">Frota</th>
                <th className="py-2 pr-4">Caixa</th>
                <th className="py-2 pr-4">Equity</th>
                <th className="py-2 pr-4">Dívida</th>
                <th className="py-2 pr-4">Capital reciclado</th>
                <th className="py-2 pr-4">Compras</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((r) => {
                const ehMelhor = r.mesVenda === melhorMes;
                return (
                  <tr
                    key={r.label}
                    onClick={() => onSelecionar(r.mesVenda)}
                    className={`cursor-pointer border-b border-neutral-100 dark:border-white/5 ${ehMelhor ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}
                  >
                    <td className="py-2 pr-4 font-medium">
                      {r.label}
                      {ehMelhor && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          Melhor
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{formatMoeda(r.patrimonio)}</td>
                    <td className="py-2 pr-4">{r.frota}</td>
                    <td className="py-2 pr-4">{formatMoeda(r.caixa)}</td>
                    <td className="py-2 pr-4">{formatMoeda(r.equity)}</td>
                    <td className="py-2 pr-4">{formatMoeda(r.divida)}</td>
                    <td className="py-2 pr-4">{formatMoeda(r.capitalReciclado)}</td>
                    <td className="py-2 pr-4">{r.compras}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-neutral-400">Clique em uma linha pra ver a trilha de auditoria completa daquela decisão.</p>
      </CardContent>
    </Card>
  );
}

function DrawerDetalhe({
  cenario,
  comparacao,
  mesDetalhe,
  onOpenChange,
}: {
  cenario: CenarioDecisaoVenda;
  comparacao: ReturnType<typeof compararMomentosDeVenda>;
  mesDetalhe: number | null | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const resultado = mesDetalhe !== undefined ? comparacao.porMomento.find((r) => r.mesVenda === mesDetalhe) ?? null : null;
  return (
    <Drawer
      open={mesDetalhe !== undefined}
      onOpenChange={onOpenChange}
      title={resultado ? `Detalhes da decisão — ${rotulo(resultado.mesVenda)}` : 'Detalhes da decisão'}
      description="Trilha de auditoria: cada evento vem direto de eventos[] do motor — nenhum número recalculado aqui."
    >
      {resultado && <DetalheDecisao cenario={cenario} resultado={resultado} />}
    </Drawer>
  );
}

function DetalheDecisao({ cenario, resultado }: { cenario: CenarioDecisaoVenda; resultado: ResultadoMomentoDeVenda }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-white/10">
        <div className="flex justify-between">
          <dt className="text-neutral-500">Patrimônio final</dt>
          <dd className="font-semibold">{formatMoeda(resultado.patrimonioFinalNoHorizonte)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Frota final</dt>
          <dd className="font-semibold">{resultado.frotaFinalUnidades} veículo(s)</dd>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Trilha de eventos</p>
        <ol className="space-y-2">
          <li className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-white/10">M0</span>
            <span>Carro original — financiamento de {formatMoeda(Math.max(0, cenario.precoVeiculo - cenario.entrada))}, entrada de {formatMoeda(cenario.entrada)}.</span>
          </li>
          {resultado.eventos.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-white/10">M{e.mes}</span>
              {e.tipo === 'venda' ? (
                <span>
                  Venda por {formatMoeda(e.valorVenda)} — saldo devedor {formatMoeda(e.saldoDevedor)}, custos de venda {formatMoeda(e.custosVenda)} → capital líquido liberado {formatMoeda(e.liquido)}.
                </span>
              ) : (
                <span>Nova aquisição — entrada de {formatMoeda(e.entradaUtilizada)} usada do capital liberado.</span>
              )}
            </li>
          ))}
          <li className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-white/10">M{cenario.horizonteMeses}</span>
            <span>
              Resultado final — caixa {formatMoeda(resultado.caixaFinal)} + equity {formatMoeda(resultado.equityFinal)} = patrimônio {formatMoeda(resultado.patrimonioFinalNoHorizonte)}.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
