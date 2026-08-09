import { CenarioForm } from './CenarioForm';
import { MarcosCrescimentoManager } from './MarcosCrescimentoManager';
import { RoadmapDeCrescimento } from './RoadmapDeCrescimento';

// Épico 3 — Simulação Empresarial. Nova porta de entrada do Centro de Estratégia (pedido
// explícito do Carlos, 2026-08-09): começar pela história do crescimento, não por gráfico/KPI.
// Ordem da tela: formulário do cenário → marcos de crescimento → roadmap visual (o resultado).
export function SimulacaoEmpresarial() {
  return (
    <div className="space-y-6">
      <CenarioForm />
      <MarcosCrescimentoManager />
      <RoadmapDeCrescimento />
    </div>
  );
}
