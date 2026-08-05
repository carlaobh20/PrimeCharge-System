// Desde a Sprint 5, Dashboard é exclusivamente analítico — a tomada de decisão operacional
// do dia a dia mudou para o Command Center (Home, ver DEC-024). Aqui entram, no futuro,
// gráficos e KPIs de tendência (histórico, comparativos ao longo do tempo, relatórios),
// não alertas/ações acionáveis.
export function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Dashboard</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Análise e tendência da frota ao longo do tempo. Para decisão operacional do dia a dia — o que precisa de
        atenção agora — use a Central de Comando.
      </p>
      <p className="mt-4 text-sm text-neutral-400">
        Gráficos e KPIs de contratos e financeiro entram conforme cada módulo é construído.
      </p>
    </div>
  );
}
