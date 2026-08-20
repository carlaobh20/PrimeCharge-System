import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import { agruparFluxoPorAno } from '../intelligence/fluxoAnual';
import type { MesSimulado } from '../intelligence/simulacaoEmpresarial';

// Épico 3 — Central de Decisão Empresarial, Fluxo Detalhado. Pedido do Carlos: "quero o fluxo
// detalhado listado também, antes do gráfico — entrada, despesas, dívida amortização, saldo da
// dívida, lucro líquido, ano a ano". Fica logo acima do gráfico de Fluxo de Caixa (Card 2).
//
// 2026-08-14 (fase "amortização extra") — a coluna única "Amortização da dívida" (que somava
// programada + extra) foi desmembrada. A leitura segue a lógica financeira: Operação (entradas,
// despesas) → Dívida/financiamento (parcela, amort. programada, amort. EXTRA, amort. total, saldo,
// juros da dívida) → Resultado (juros do caixa, IR, lucro líquido) → Caixa → veículos comprados.
// Toda célula lê um campo que já nasce no motor (MesSimulado / fluxoAnual) — o componente não
// recalcula nada. "Parcela = Juros da dívida + Amort. programada" (identidade da Tabela Price);
// "Amort. total = Amort. programada + Amort. extra". A extra aparece com "—" quando é 0, e com o
// valor exato no mês em que ocorreu — sem poluir os meses sem aporte.

// Cada linha da tabela, já no formato de exibição. null = "—" (não se aplica àquela linha, ex.
// a linha "Hoje" não tem receita/parcela). Nenhuma dessas contas nasce aqui: todos os números
// vêm dos campos do motor (MesSimulado) ou da agregação anual (fluxoAnual.ts).
type LinhaFluxo = {
  rotulo: string;
  destaque: boolean;
  entrada: number | null;
  despesas: number | null;
  parcela: number | null;
  amortProgramada: number | null;
  amortExtra: number | null;
  amortTotal: number | null;
  saldoDivida: number | null;
  jurosDivida: number | null;
  jurosCaixa: number | null;
  ir: number | null;
  lucro: number | null;
  caixa: number | null;
  veiculos: number | null;
  veiculosLabel: string;
};

function linhaMensal(m: MesSimulado): LinhaFluxo {
  return {
    rotulo: `Mês ${m.mes}`,
    destaque: m.comprasNoMes > 0,
    entrada: m.receitaMensal,
    despesas: m.despesaSemParcelaMensal,
    parcela: m.despesaBreakdown.parcelas,
    amortProgramada: m.amortizacaoProgramadaMensal,
    amortExtra: m.amortizacaoExtraMensal,
    amortTotal: m.amortizacaoTotalMensal,
    saldoDivida: m.saldoDevedorTotal,
    jurosDivida: m.jurosFinanciamentoMensal,
    jurosCaixa: m.jurosInvestimentoMensal,
    ir: m.irMensal,
    lucro: m.lucroMensal,
    caixa: m.caixaDisponivel,
    veiculos: m.comprasNoMes,
    veiculosLabel: m.comprasNoMes > 0 ? `+${m.comprasNoMes}` : '—',
  };
}

/** Traço quando o valor é ~0 — evita poluir a tabela com "R$ 0,00" em colunas que costumam zerar
 * (extra, juros, IR, e a própria parcela quando a dívida já foi quitada). */
function moedaOuTraco(v: number | null): string {
  if (v === null) return '—';
  return v > 0.005 ? formatMoeda(v) : '—';
}
function moeda(v: number | null): string {
  return v === null ? '—' : formatMoeda(v);
}

// Metadados de coluna: rótulo, grupo (cabeçalho superior), dica (tooltip via title) e como formata
// cada célula. `emphasis` marca as colunas novas da fase de amortização, destacadas em cor pra
// leitura rápida. A ordem deste array É a ordem das colunas.
type ColKey = keyof Omit<LinhaFluxo, 'rotulo' | 'destaque' | 'veiculos' | 'veiculosLabel'>;
type Coluna = {
  key: ColKey | 'periodo' | 'veiculos';
  label: string;
  grupo: '' | 'Operação' | 'Dívida / financiamento' | 'Resultado' | 'Caixa';
  dica?: string;
};

const COLUNAS: Coluna[] = [
  { key: 'periodo', label: 'Período', grupo: '' },
  { key: 'entrada', label: 'Entradas', grupo: 'Operação' },
  { key: 'despesas', label: 'Despesas', grupo: 'Operação', dica: 'Só custo operacional (seguro, IPVA, rastreador, lavagem, manutenção, licenciamento, contador). A parcela do financiamento entra separada.' },
  { key: 'parcela', label: 'Parcela', grupo: 'Dívida / financiamento', dica: 'Parcela normal do financiamento (Tabela Price) = juros da dívida + amortização programada.' },
  { key: 'amortProgramada', label: 'Amort. programada', grupo: 'Dívida / financiamento', dica: 'Parte da parcela normal que reduz o principal do financiamento.' },
  { key: 'amortExtra', label: 'Amort. extra', grupo: 'Dívida / financiamento', dica: 'Pagamento adicional ao principal da dívida. Reduz o saldo devedor e os juros futuros, mas não é uma despesa operacional. Limitado pelo caixa e pelo saldo devedor do mês.' },
  { key: 'amortTotal', label: 'Amort. total', grupo: 'Dívida / financiamento', dica: 'Amortização programada + amortização extraordinária no período.' },
  { key: 'saldoDivida', label: 'Saldo da dívida', grupo: 'Dívida / financiamento', dica: 'Quanto ainda se deve ao banco no fim do período.' },
  { key: 'jurosDivida', label: 'Juros da dívida', grupo: 'Dívida / financiamento', dica: 'Juros financeiros calculados sobre o saldo devedor do financiamento (parte de juros embutida na parcela).' },
  { key: 'jurosCaixa', label: 'Juros do caixa', grupo: 'Resultado', dica: 'Rendimento do dinheiro parado em caixa (configurável em Reinvestimento). Já somado dentro do Lucro líquido.' },
  { key: 'ir', label: 'IR', grupo: 'Resultado', dica: 'Imposto sobre o lucro do período. Já descontado dentro do Lucro líquido.' },
  { key: 'lucro', label: 'Lucro líquido', grupo: 'Resultado', dica: 'Receita + juros do caixa − despesas (incluindo a parcela inteira) − IR. A amortização extra NÃO reduz o lucro — é redução de dívida, não despesa.' },
  { key: 'caixa', label: 'Caixa', grupo: 'Caixa', dica: 'Caixa disponível após entradas, despesas, parcelas, amortizações extraordinárias e demais movimentos do mês (saldo, não soma).' },
  { key: 'veiculos', label: 'Veículo(s) comprado(s)', grupo: '' },
];

/** Classe de cor por coluna (mantém o padrão visual existente: verde = entra/positivo, vermelho =
 * sai/custo, neutro = saldo/estrutura, azul = compra). A amort. extra fica verde quando > 0 porque
 * é ação que constrói patrimônio (reduz dívida), não custo. */
function classeCor(col: Coluna, l: LinhaFluxo, reservaMinima: number): string {
  switch (col.key) {
    case 'entrada':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'despesas':
    case 'parcela':
    case 'jurosDivida':
    case 'ir':
      return 'text-red-500';
    case 'jurosCaixa':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'amortExtra':
      return (l.amortExtra ?? 0) > 0.005 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-neutral-400';
    case 'lucro':
      return cn('font-semibold', (l.lucro ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500');
    case 'caixa':
      return (l.caixa ?? 0) < reservaMinima ? 'font-semibold text-red-500' : 'text-neutral-600 dark:text-neutral-300';
    case 'veiculos':
      return 'text-sky-600 dark:text-sky-400';
    default:
      return 'text-neutral-600 dark:text-neutral-300';
  }
}

/** Texto de cada célula. Colunas que costumam zerar usam traço; entradas/saldo/lucro/caixa sempre
 * mostram o número (0 legítimo é informação). */
function textoCelula(col: Coluna, l: LinhaFluxo, reservaMinima: number): string {
  switch (col.key) {
    case 'periodo':
      return l.rotulo;
    case 'veiculos':
      return l.veiculosLabel;
    case 'parcela':
    case 'amortProgramada':
    case 'amortExtra':
    case 'amortTotal':
    case 'jurosDivida':
    case 'jurosCaixa':
    case 'ir':
      return moedaOuTraco(l[col.key]);
    case 'caixa': {
      const base = moeda(l.caixa);
      return l.caixa !== null && l.caixa < reservaMinima ? `${base} ⚠️` : base;
    }
    default:
      return moeda(l[col.key as ColKey]);
  }
}

// Cabeçalho superior agrupado: quantas colunas cada grupo abrange, na ordem de COLUNAS.
function gruposDoCabecalho() {
  const grupos: { titulo: string; span: number }[] = [];
  for (const col of COLUNAS) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.titulo === col.grupo) ultimo.span += 1;
    else grupos.push({ titulo: col.grupo, span: 1 });
  }
  return grupos;
}

export function FluxoDetalhadoTable({ meses, reservaMinima }: { meses: MesSimulado[]; reservaMinima: number }) {
  const [visao, setVisao] = useState<'ano' | 'mes'>('ano');
  const anos = agruparFluxoPorAno(meses);
  const hoje = meses.find((m) => m.mes === 0);
  const mensal = meses.filter((m) => m.mes > 0).map(linhaMensal);

  const linhaHoje: LinhaFluxo | null = hoje
    ? {
        rotulo: 'Hoje',
        destaque: false,
        entrada: null,
        despesas: null,
        parcela: null,
        amortProgramada: null,
        amortExtra: null,
        amortTotal: null,
        saldoDivida: hoje.saldoDevedorTotal,
        jurosDivida: null,
        jurosCaixa: null,
        ir: null,
        lucro: null,
        caixa: hoje.caixaDisponivel,
        veiculos: hoje.comprasNoMes,
        veiculosLabel: hoje.comprasNoMes > 0 ? `${hoje.comprasNoMes} (frota inicial)` : '—',
      }
    : null;

  const anuais: LinhaFluxo[] = anos.map((a) => ({
    rotulo: a.rotulo,
    destaque: false,
    entrada: a.entrada,
    despesas: a.despesas,
    parcela: a.parcela,
    amortProgramada: a.amortizacaoProgramada,
    amortExtra: a.amortizacaoExtra,
    amortTotal: a.amortizacaoDaDivida,
    saldoDivida: a.saldoDaDivida,
    jurosDivida: a.jurosFinanciamento,
    jurosCaixa: a.jurosInvestimento,
    ir: a.ir,
    lucro: a.lucroLiquido,
    caixa: a.caixaFinal,
    veiculos: a.veiculosComprados,
    veiculosLabel: a.veiculosComprados > 0 ? `+${a.veiculosComprados}` : '—',
  }));

  const linhas = visao === 'ano' ? anuais : mensal;
  const grupos = gruposDoCabecalho();

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
        <table className="w-full min-w-[1240px] border-collapse text-sm">
          <thead className={visao === 'mes' ? 'sticky top-0 z-10 bg-white dark:bg-neutral-900' : undefined}>
            <tr className="text-left text-[10px] uppercase tracking-wide text-neutral-300 dark:text-neutral-600">
              {grupos.map((g, i) => (
                <th
                  key={`${g.titulo}-${i}`}
                  colSpan={g.span}
                  className={cn('pb-0.5 font-semibold', g.titulo && 'border-b border-neutral-100 dark:border-white/5', i > 0 && 'pl-3 text-right')}
                >
                  {g.titulo}
                </th>
              ))}
            </tr>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-white/10">
              {COLUNAS.map((col, i) => (
                <th
                  key={col.key}
                  title={col.dica}
                  className={cn('py-2 pr-3 font-medium', i > 0 && 'text-right', col.dica && 'cursor-help underline decoration-dotted decoration-neutral-300 underline-offset-4 dark:decoration-neutral-600')}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhaHoje && (
              <tr className="border-b border-neutral-100 text-neutral-400 dark:border-white/5">
                {COLUNAS.map((col, i) => (
                  <td key={col.key} className={cn('py-2 pr-3', i > 0 && 'text-right', col.key === 'periodo' && 'font-medium')}>
                    {textoCelula(col, linhaHoje, reservaMinima)}
                  </td>
                ))}
              </tr>
            )}
            {linhas.map((l) => (
              <tr
                key={l.rotulo}
                className={cn('border-b border-neutral-100 dark:border-white/5', l.destaque && 'bg-sky-50/60 dark:bg-sky-500/[0.06]')}
              >
                {COLUNAS.map((col, i) => (
                  <td
                    key={col.key}
                    className={cn(
                      'py-2 pr-3',
                      i > 0 && 'text-right',
                      col.key === 'periodo' ? 'font-medium text-neutral-700 dark:text-neutral-300' : classeCor(col, l, reservaMinima)
                    )}
                  >
                    {textoCelula(col, l, reservaMinima)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] leading-snug text-neutral-400">
          "Parcela" é o pagamento normal do financiamento e já contém "Juros da dívida" + "Amort. programada" — não é uma despesa a mais
          além disso. "Amort. extra" é o pagamento adicional ao principal (Card Amortização): sai do caixa e reduz o saldo devedor,
          mas não é despesa nem reduz o lucro diretamente; aparece "—" nos meses sem aporte e no valor exato no mês em que ocorre (limitado
          pelo caixa e pelo saldo do mês). "Amort. total" = programada + extra. "Caixa" é o saldo em conta no fim do período (não soma
          mês a mês). Linhas em azul, na visão mensal, são meses de compra de veículo. Caixa em vermelho com ⚠️ furou a reserva de segurança.
        </p>
      </CardContent>
    </Card>
  );
}
