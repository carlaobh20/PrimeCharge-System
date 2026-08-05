import type { Impacto, Prioridade, Urgencia } from '@/shared/intelligence/types';

// Único ponto que decide "o que é prioridade" — todo outro engine chama esta função em vez
// de inventar sua própria régua. Matriz simples e auditável, não um score numérico opaco:
// dá pra olhar a tabela e entender por que algo virou "crítica" sem ler código nenhum.
const MATRIZ: Record<Impacto, Record<Urgencia, Prioridade>> = {
  alto: { alta: 'critica', media: 'alta', baixa: 'alta' },
  medio: { alta: 'alta', media: 'media', baixa: 'baixa' },
  baixo: { alta: 'media', media: 'baixa', baixa: 'baixa' },
};

export function calcularPrioridade(impacto: Impacto, urgencia: Urgencia): Prioridade {
  return MATRIZ[impacto][urgencia];
}

const RANK: Record<Prioridade, number> = { critica: 3, alta: 2, media: 1, baixa: 0 };

export function ordenarPorPrioridade<T extends { prioridade: Prioridade }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => RANK[b.prioridade] - RANK[a.prioridade]);
}

// "Prioridades do Dia" = os N itens de maior prioridade entre TODOS os tipos (alerta,
// risco, oportunidade, ação) — por isso recebe uma lista já misturada, não um tipo só.
export function selecionarPrioridadesDoDia<T extends { prioridade: Prioridade }>(itens: T[], limite = 6): T[] {
  return ordenarPorPrioridade(itens).slice(0, limite);
}
