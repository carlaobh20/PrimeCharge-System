import type { Insight } from './types';

export type InsightsInput = {
  diasComoCliente: number | null;
  diasAteVencimentoCnh: number | null;
  totalComentarios: number;
  totalTags: number;
};

// Observações neutras derivadas de dado real — mesmo contrato de gerarInsights (Veículo).
export function gerarInsights(input: InsightsInput): Insight[] {
  const { diasComoCliente, diasAteVencimentoCnh, totalComentarios, totalTags } = input;
  const insights: Insight[] = [];

  if (diasComoCliente !== null) {
    insights.push({
      id: 'dias-como-cliente',
      texto: `Cliente há ${diasComoCliente} ${diasComoCliente === 1 ? 'dia' : 'dias'}.`,
      severidade: 'info',
      categoria: 'operacional',
    });
  }

  if (diasAteVencimentoCnh !== null && diasAteVencimentoCnh > 30) {
    insights.push({
      id: 'cnh-em-dia',
      texto: `CNH válida por mais ${diasAteVencimentoCnh} dias.`,
      severidade: 'info',
      categoria: 'documental',
    });
  }

  if (totalComentarios > 0) {
    insights.push({
      id: 'comentarios',
      texto: `${totalComentarios} ${totalComentarios === 1 ? 'comentário registrado' : 'comentários registrados'} no histórico.`,
      severidade: 'info',
      categoria: 'operacional',
    });
  }

  if (totalTags > 0) {
    insights.push({
      id: 'tags',
      texto: `Marcado com ${totalTags} ${totalTags === 1 ? 'tag' : 'tags'}.`,
      severidade: 'info',
      categoria: 'operacional',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'sem-insight',
      texto: 'Ainda não há dado suficiente para gerar observações.',
      severidade: 'info',
      categoria: 'operacional',
    });
  }

  return insights;
}
