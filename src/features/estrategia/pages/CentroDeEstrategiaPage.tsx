import { Compass, TrendingUp, Wallet, PiggyBank } from 'lucide-react';

// Épico 2 — Centro de Estratégia, Fase 1 (Foundation). Entrega desta fase: a fundação em volta
// do módulo (rota, gate de acesso só-proprietário em RequireOwner.tsx, item de menu condicional
// em AppLayout.tsx, e a biblioteca de gráficos escolhida — recharts, ver auditoria — instalada
// e pronta pro Laboratório 1). Deliberadamente NÃO tem nenhum número nesta tela ainda: mostrar
// um placar com dado inventado só pra "parecer pronto" violaria o mesmo princípio de
// honestidade de dado que rege o resto da plataforma (DEC-022) — Laboratório 1 (Visão
// Executiva) é a próxima fase, com os KPIs reais vindos de calcularResumoFinanceiro/calcularRoi
// já existentes (ver auditoria-epico2-centro-de-estrategia-2026-08-09.md).
export function CentroDeEstrategiaPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20">
        <Compass className="h-7 w-7" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Centro de Estratégia</h1>
        <p className="max-w-md text-sm text-neutral-500">
          Fundação pronta — acesso restrito ao proprietário, gráficos premium instalados. O primeiro laboratório
          (Visão Executiva) chega na próxima fase.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { icon: TrendingUp, label: 'Visão Executiva', hint: 'próxima fase' },
          { icon: Wallet, label: 'Comitê de Investimentos', hint: 'em breve' },
          { icon: PiggyBank, label: 'Capital', hint: 'em breve' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex min-w-[168px] flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-4 opacity-70 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <item.icon className="h-4 w-4 text-neutral-400" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{item.label}</span>
            <span className="text-[11px] text-neutral-400">{item.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
