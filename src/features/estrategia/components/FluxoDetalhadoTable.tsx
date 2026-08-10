import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import { agruparFluxoPorAno } from '../intelligence/fluxoAnual';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

// Épico 3 — Central de Decisão Empresarial, Fluxo Detalhado. Pedido do Carlos: "quero o fluxo
// detalhado listado também, antes do gráfico — entrada, despesas, dívida amortização, saldo da
// dívida, lucro líquido, ano a ano". Fica logo acima do gráfico de Fluxo de Caixa (Card 2) — quem
// quer o número exato lê a tabela, quem quer a tendência olha o gráfico logo abaixo.
//
// Segunda rodada (mesmo dia): Carlos pediu duas coisas a mais — (1) "quero ver o momento de
// compra dos carros... no fluxo" → nova coluna "Veículo(s) comprado(s)" em ambas as visões; (2)
// "me mostre também o fluxo mês a mês e não somente ano a ano" → visão Ano a ano continua sendo o
// padrão (é o resumo que a maioria vai olhar primeiro), com um toggle pra Mês a mês — não troquei
// uma pela outra porque ele disse "também", não "em vez de". A visão mensal fica dentro de um
// container com scroll interno (max-h) pra não estourar a altura da página de novo (o problema
// que resolvemos hoje mais cedo era exatamente "rolar demais").
//
// Terceira rodada (2026-08-10) — juros do caixa aplicado, IR e caixa final: "quero que coloque o
// caixa, se tiver dinheiro aplicado, mostrar o juros, e o caixa no final de cada mes... quero que
// mostre o IR de cada mês". Três colunas novas entre "Saldo da dívida" e "Lucro líquido" — nessa
// posição porque Juros e IR são justamente o que transforma o lucro operacional em "Lucro
// líquido" (que já é líquido de IR, ver simulacaoEmpresarial.ts) — e "Caixa" depois do Lucro
// líquido, mostrando o saldo em conta no fim do período. Juros e IR ficam com traço quando ~0
// (a maioria dos cenários antigos tem taxa_juros_investimento_aa_pct e taxa_ir_pct zerados —
// não faz sentido poluir a tabela com "R$ 0,00" em toda linha).
function linhaMensal(m: MesSimulado) {
  return {
    rotulo: `Mês ${m.mes}`,
    entrada: m.receitaMensal,
    despesas: m.despesaMensal - m.despesaBreakdown.parcelas,
    amortizacaoDaDivida: m.amortizacaoProgramadaMensal + m.amortizacaoExtraMensal,
    saldoDaDivida: m.saldoDevedorTotal,
    jurosInvestimento: m.jurosInvestimentoMensal,
    ir: m.irMensal,
    lucroLiquido: m.lucroMensal,
    caixa: m.caixaDisponivel,
    veiculosComprados: m.comprasNoMes,
  };
}

/** Traço quando o valor é irrelevante (cenário sem juros/IR configurado) — evita poluir a tabela com "R$ 0,00". */
function valorOuTraco(v: number) {
  return v > 0.005 ? formatMoeda(v) : '—';
}

const CABECALHO = [
  'Período',
  'Entrada',
  'Despesas',
  'Amortização da dívida',
  'Saldo da dívida',
  'Juros do caixa',
  'IR',
  'Lucro líquido',
  'Caixa',
  'Veículo(s) comprado(s)',
];

export function FluxoDetalhadoTable({ meses, reservaMinima }: { meses: MesSimulado[]; reservaMinima: number }) {
  const [visao, setVisao] = useState<'ano' | 'mes'>('ano');
  const anos = agruparFluxoPorAno(meses);
  const hoje = meses.find((m) => m.mes === 0);
  const mensal = meses.filter((m) => m.mes > 0).map(linhaMensal);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Fluxo detalhado</CardTitle>
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-0.5 dark:bg-white/5">
          <button
            type="button"
            onClick={() => setVisao('ano')}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              visao === 'ano' ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100' : 'text-neutral-500'
            )}
          >
            Ano a ano
          </button>
          <button
            type="button"
            onClick={() => setVisao('mes')}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              visao === 'mes' ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100' : 'text-neutral-500'
            )}
          >
            Mês a mês
          </button>
        </div>
      </CardHeader>
      <CardContent className={cn('overflow-x-auto', visao === 'mes' && 'max-h-[420px] overflow-y-auto')}>
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className={visao === 'mes' ? 'sticky top-0 z-10 bg-white dark:bg-neutral-900' : undefined}>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-white/10">
              {CABECALHO.map((titulo, i) => (
                <th key={titulo} className={cn('py-2 pr-3 font-medium', i > 0 && 'text-right')}>
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hoje && (
              <tr className="border-b border-neutral-100 text-neutral-400 dark:border-white/5">
                <td className="py-2 pr-3 font-medium">Hoje</td>
                <td className="py-2 pr-3 text-right">—</td>
                <td className="py-2 pr-3 text-right">—</td>
                <td className="py-2 pr-3 text-right">—</td>
                <td className="py-2 pr-3 text-right">{formatMoeda(hoje.saldoDevedorTotal)}</td>
                <td className="py-2 pr-3 text-right">—</td>
                <td className="py-2 pr-3 text-right">—</td>
                <td className="py-2 pr-3 text-right">—</td>
                <td className="py-2 pr-3 text-right">{formatMoeda(hoje.caixaDisponivel)}</td>
                <td className="py-2 pr-3 text-right">{hoje.comprasNoMes > 0 ? `${hoje.comprasNoMes} (frota inicial)` : '—'}</td>
              </tr>
            )}
            {visao === 'ano'
              ? anos.map((ano) => (
                  <tr key={ano.rotulo} className="border-b border-neutral-100 dark:border-white/5">
                    <td className="py-2 pr-3 font-medium text-neutral-700 dark:text-neutral-300">{ano.rotulo}</td>
                    <td className="py-2 pr-3 text-right text-emerald-600 dark:text-emerald-400">{formatMoeda(ano.entrada)}</td>
                    <td className="py-2 pr-3 text-right text-red-500">{formatMoeda(ano.despesas)}</td>
                    <td className="py-2 pr-3 text-right text-neutral-600 dark:text-neutral-300">{formatMoeda(ano.amortizacaoDaDivida)}</td>
                    <td className="py-2 pr-3 text-right text-neutral-600 dark:text-neutral-300">{formatMoeda(ano.saldoDaDivida)}</td>
                    <td className="py-2 pr-3 text-right text-emerald-600 dark:text-emerald-400">{valorOuTraco(ano.jurosInvestimento)}</td>
                    <td className="py-2 pr-3 text-right text-red-500">{valorOuTraco(ano.ir)}</td>
                    <td
                      className={cn(
                        'py-2 pr-3 text-right font-semibold',
                        ano.lucroLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                      )}
                    >
                      {formatMoeda(ano.lucroLiquido)}
                    </td>
                    <td className={cn('py-2 pr-3 text-right', ano.caixaFinal < reservaMinima ? 'font-semibold text-red-500' : 'text-neutral-600 dark:text-neutral-300')}>
                      {formatMoeda(ano.caixaFinal)}
                      {ano.caixaFinal < reservaMinima && ' ⚠️'}
                    </td>
                    <td className="py-2 pr-3 text-right text-sky-600 dark:text-sky-400">{ano.veiculosComprados > 0 ? `+${ano.veiculosComprados}` : '—'}</td>
                  </tr>
                ))
              : mensal.map((m) => (
                  <tr
                    key={m.rotulo}
                    className={cn(
                      'border-b border-neutral-100 dark:border-white/5',
                      m.veiculosComprados > 0 && 'bg-sky-50/60 dark:bg-sky-500/[0.06]'
                    )}
                  >
                    <td className="py-2 pr-3 font-medium text-neutral-700 dark:text-neutral-300">{m.rotulo}</td>
                    <td className="py-2 pr-3 text-right text-emerald-600 dark:text-emerald-400">{formatMoeda(m.entrada)}</td>
                    <td className="py-2 pr-3 text-right text-red-500">{formatMoeda(m.despesas)}</td>
                    <td className="py-2 pr-3 text-right text-neutral-600 dark:text-neutral-300">{formatMoeda(m.amortizacaoDaDivida)}</td>
                    <td className="py-2 pr-3 text-right text-neutral-600 dark:text-neutral-300">{formatMoeda(m.saldoDaDivida)}</td>
                    <td className="py-2 pr-3 text-right text-emerald-600 dark:text-emerald-400">{valorOuTraco(m.jurosInvestimento)}</td>
                    <td className="py-2 pr-3 text-right text-red-500">{valorOuTraco(m.ir)}</td>
                    <td
                      className={cn(
                        'py-2 pr-3 text-right font-semibold',
                        m.lucroLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                      )}
                    >
                      {formatMoeda(m.lucroLiquido)}
                    </td>
                    <td className={cn('py-2 pr-3 text-right', m.caixa < reservaMinima ? 'font-semibold text-red-500' : 'text-neutral-600 dark:text-neutral-300')}>
                      {formatMoeda(m.caixa)}
                      {m.caixa < reservaMinima && ' ⚠️'}
                    </td>
                    <td className="py-2 pr-3 text-right text-sky-600 dark:text-sky-400">{m.veiculosComprados > 0 ? `+${m.veiculosComprados}` : '—'}</td>
                  </tr>
                ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-neutral-400">
          "Despesas" é só custo operacional (seguro, IPVA, rastreador, lavagem, manutenção, licenciamento, contador) — a parcela do
          financiamento entra separada, em "Amortização da dívida" (o que reduziu o principal) e nos juros embutidos no lucro líquido.
          "Juros do caixa" é o rendimento do dinheiro parado em caixa (configurável em Reinvestimento) e "IR" é o imposto sobre o lucro
          do período — os dois já estão descontados/somados dentro de "Lucro líquido". "Caixa" é o saldo em conta no fim do período (não
          soma mês a mês — é o saldo). Linhas destacadas em azul, na visão mensal, são meses em que um veículo foi comprado. Caixa em vermelho com ⚠️
          significa que o saldo furou a reserva de segurança — a operação está consumindo capital próprio.
        </p>
      </CardContent>
    </Card>
  );
}
