import type { Alerta, HealthScoreResult, Risk } from './types';

export type RisksInput = {
  alertas: Alerta[];
  healthScore: HealthScoreResult;
};

// Diferente de opportunities.ts (que é sempre específico do domínio — o que é "uma boa
// oportunidade" muda completamente entre Veículo e Motorista), a regra de Risco é genuína e
// totalmente genérica: promove a Risco todo Alerta crítico e toda categoria de Health Score
// com status crítico, sem nenhum conhecimento sobre de qual entidade eles vieram. Por isso
// mora em shared/ desde já (Sprint 6, DEC-025) — não é uma feature "emprestando" de outra
// (o que DEC-008 proíbe), é uma função pura sem nenhum domínio embutido, como formatKm.
export function gerarRiscos(input: RisksInput): Risk[] {
  const { alertas, healthScore } = input;
  const riscos: Risk[] = [];

  for (const alerta of alertas.filter((a) => a.severidade === 'critico')) {
    riscos.push({ id: `risco-${alerta.id}`, texto: alerta.texto, categoria: alerta.categoria });
  }

  for (const categoria of healthScore.categorias.filter((c) => c.status === 'critico')) {
    riscos.push({
      id: `risco-saude-${categoria.categoria}`,
      texto: `${categoria.label} crítica: ${categoria.motivos.join(' ')}`,
      categoria: categoria.categoria,
    });
  }

  return riscos;
}
