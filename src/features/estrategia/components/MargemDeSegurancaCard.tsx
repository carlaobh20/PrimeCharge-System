import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import type { MargemDeSeguranca, Runway, NivelDeSeguranca } from '../intelligence/margemDeSeguranca';

// Épico 3 — Central de Decisão Empresarial, "Margem de Segurança da Operação" (2026-08-10,
// missão do Carlos: "copiloto financeiro" — cada card deve responder uma pergunta, com semáforo,
// sem exigir interpretação). Este é o card mais importante da tela agora, por isso fica no topo,
// antes até da Visão Executiva: em menos de 3 segundos precisa responder "posso dormir
// tranquilo?" (Prioridade 9, "Saúde da Operação", fundida aqui — ver nota de escopo no rodapé).
//
// Nota de escopo (honestidade de dado, DEC-022): o pedido original de "Saúde da Operação"
// listava também Motorista/Veículo/Documentação/Seguro como dimensões a considerar — este card
// cobre só a saúde FINANCEIRA (o que o simulador de cenário hipotético tem dado pra calcular).
// Motorista/documentação/seguro-como-compliance são dado REAL de frota (outro domínio, Centro de
// Operações), não existem dentro da Central de Decisão — fingir que este selo os considera seria
// inventar dado que não existe. Ver rodapé do card.

const CONFIG_NIVEL: Record<NivelDeSeguranca, { icon: typeof ShieldCheck; titulo: string; cor: string; bg: string }> = {
  seguro: { icon: ShieldCheck, titulo: 'Operação Saudável', cor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  atencao: { icon: ShieldAlert, titulo: 'Atenção', cor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  risco: { icon: ShieldX, titulo: 'Operação em Risco', cor: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
};

function LinhaMargem({
  label,
  atual,
  minimo,
  margemPct,
  unidade,
}: {
  label: string;
  atual: string;
  minimo: string;
  margemPct: number | null;
  unidade?: string;
}) {
  const cor = margemPct === null ? 'text-neutral-400' : margemPct < 0 ? 'text-red-500' : margemPct < 15 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-white/10">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{atual}</p>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-400">
        <span>Break-even: {minimo}</span>
        {margemPct !== null && (
          <span className={cn('font-semibold', cor)}>
            {margemPct >= 0 ? '+' : ''}
            {margemPct.toFixed(0)}
            {unidade ?? '%'}
          </span>
        )}
      </div>
    </div>
  );
}

export function MargemDeSegurancaCard({ margem, runway }: { margem: MargemDeSeguranca; runway: Runway }) {
  const cfg = CONFIG_NIVEL[margem.nivel];
  const Icon = cfg.icon;

  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn('flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between', cfg.bg)}>
          <div className="flex items-center gap-3">
            <Icon className={cn('h-8 w-8 shrink-0', cfg.cor)} />
            <div>
              <p className={cn('text-xl font-bold', cfg.cor)}>{cfg.titulo}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{margem.motivo}</p>
            </div>
          </div>
        </div>

        {margem.frotaAtual > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <LinhaMargem
              label="Ocupação"
              atual={`${margem.ocupacaoAtualPct.toFixed(0)}%`}
              minimo={margem.ocupacaoMinimaPct !== null ? `${margem.ocupacaoMinimaPct.toFixed(0)}%` : '—'}
              margemPct={margem.margemOcupacaoPct}
            />
            <LinhaMargem
              label="Aluguel semanal"
              atual={formatMoeda(margem.aluguelSemanalAtual)}
              minimo={margem.aluguelSemanalMinimo !== null ? formatMoeda(margem.aluguelSemanalMinimo) : '—'}
              margemPct={margem.margemFinanceiraPct}
            />
            <LinhaMargem label="Receita do mês" atual={formatMoeda(margem.receitaAtual)} minimo={formatMoeda(margem.receitaMinima)} margemPct={margem.margemReceitaPct} />
            <LinhaMargem label="Caixa" atual={formatMoeda(margem.caixaAtual)} minimo={formatMoeda(margem.reservaMinima)} margemPct={margem.margemCaixaPct} />
          </div>
        )}

        {margem.diasParadoMaximo !== null && (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
            O carro pode ficar parado até <span className="font-semibold">{margem.diasParadoMaximo} {margem.diasParadoMaximo === 1 ? 'dia' : 'dias'}</span> por mês sem dar prejuízo (dos 30 dias do mês).
          </p>
        )}

        <div
          className={cn(
            'mt-3 rounded-xl border p-3 text-sm',
            runway.precisaAporte ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
          )}
        >
          {runway.mensagem}
        </div>

        <p className="mt-3 text-[11px] text-neutral-400">
          Esta é a saúde FINANCEIRA do cenário simulado (break-even, caixa, reserva, lucro). Motorista, documentação e seguro do veículo são dado real da frota — vivem no Centro de Operações, não neste simulador.
        </p>
      </CardContent>
    </Card>
  );
}
