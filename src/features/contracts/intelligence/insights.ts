import type { ContratoPeriodicidade } from '../types';
import type { Insight } from './types';

export type InsightsInput = {
  status: string;
  diasDeContratoAtivo: number | null;
  valorPeriodico: number;
  periodicidade: ContratoPeriodicidade;
  totalComentarios: number;
};

const PERIODICIDADE_LABEL: Record<ContratoPeriodicidade, string> = {
  diaria: 'dia',
  semanal: 'semana',
  mensal: 'mês',
};

// Observações neutras derivadas de dado real — mesmo contrato de gerarInsights (Veículo/
// Motorista). O valor contratado é mostrado como o que É (a tarifa acordada), nunca como
// "receita recebida" — isso depende do módulo Financeiro (regra de Honestidade da sprint).
export function gerarInsights(input: InsightsInput): Insight[] {
  const { status, diasDeContratoAtivo, valorPeriodico, periodicidade, totalComentarios } = input;
  const insights: Insight[] = [];

  if (status === 'ativo' && diasDeContratoAtivo !== null) {
    insights.push({
      id: 'dias-ativo',
      texto: `Contrato ativo há ${diasDeContratoAtivo} ${diasDeContratoAtivo === 1 ? 'dia' : 'dias'}.`,
      severidade: 'info',
      categoria: 'operacional',
    });
  }

  insights.push({
    id: 'valor-contratado',
    texto: `Tarifa acordada: ${valorPeriodico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por ${PERIODICIDADE_LABEL[periodicidade]}.`,
    severidade: 'info',
    categoria: 'comercial',
  });

  if (totalComentarios > 0) {
    insights.push({
      id: 'comentarios',
      texto: `${totalComentarios} ${totalComentarios === 1 ? 'comentário registrado' : 'comentários registrados'} no histórico.`,
      severidade: 'info',
      categoria: 'operacional',
    });
  }

  return insights;
}
