import type { Veiculo } from '../types';
import type { Insight } from './types';

export type InsightsInput = {
  veiculo: Pick<Veiculo, 'valor_compra' | 'valor_mercado'>;
  diasNaFrota: number | null;
  totalComentarios: number;
  totalTags: number;
};

// Observações neutras derivadas de dado real — diferente de Alerta (que pede atenção) e
// de Próxima Ação (que sugere uma ação concreta).
export function gerarInsights(input: InsightsInput): Insight[] {
  const { veiculo, diasNaFrota, totalComentarios, totalTags } = input;
  const insights: Insight[] = [];

  if (diasNaFrota !== null) {
    insights.push({
      id: 'dias-na-frota',
      texto: `Na frota há ${diasNaFrota} ${diasNaFrota === 1 ? 'dia' : 'dias'}.`,
      severidade: 'info',
    });
  }

  if (veiculo.valor_compra !== null && veiculo.valor_mercado !== null && veiculo.valor_compra > 0) {
    const percentual = Math.round((veiculo.valor_mercado / veiculo.valor_compra) * 100);
    insights.push({
      id: 'valorizacao',
      texto: `Valor de mercado é ${percentual}% do valor de compra.`,
      severidade: percentual < 60 ? 'atencao' : 'info',
    });
  }

  if (totalComentarios > 0) {
    insights.push({
      id: 'comentarios',
      texto: `${totalComentarios} ${totalComentarios === 1 ? 'comentário registrado' : 'comentários registrados'} no histórico.`,
      severidade: 'info',
    });
  }

  if (totalTags > 0) {
    insights.push({ id: 'tags', texto: `Marcado com ${totalTags} ${totalTags === 1 ? 'tag' : 'tags'}.`, severidade: 'info' });
  }

  if (insights.length === 0) {
    insights.push({ id: 'sem-insight', texto: 'Ainda não há dado suficiente para gerar observações.', severidade: 'info' });
  }

  return insights;
}
