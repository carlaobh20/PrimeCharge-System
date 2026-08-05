import type { CategoriaHealthResult } from '../types';

/**
 * Saúde Patrimonial — sem regra real ainda: km_inicial/carga_inicial_pct hoje são campos
 * simples do contrato, não uma vistoria estruturada e comparável (isso é a Inspeção
 * Inteligente de SMART_FLEET_PLATFORM.md, seção 5 — Checklist ainda não tem IA por cima).
 * Score null de propósito — nunca um valor inventado só pra preencher a categoria (DEC-022).
 */
export function calcularSaudePatrimonial(): CategoriaHealthResult {
  return {
    categoria: 'patrimonial',
    label: 'Saúde Patrimonial',
    score: null,
    status: 'sem_dado',
    motivos: ['Depende de vistoria estruturada (Inspeção Inteligente), ainda não construída.'],
  };
}
