import { calcularSaudePatrimonial as calcularSaudePatrimonialVeiculo } from '@/features/frota/intelligence';
import type { Veiculo } from '@/features/frota/types';
import type { CategoriaHealthResult } from '../types';

export type SaudePatrimonialInput = {
  veiculo: Pick<Veiculo, 'valor_compra' | 'valor_fipe' | 'valor_mercado'> | null;
};

/**
 * Saúde Patrimonial do Motorista — achado da auditoria da Missão 2 (2026-08-06), mesma classe
 * de dívida que DEC-070 fechou para a Saúde Comercial do Veículo: o comentário original dizia
 * "depende do módulo de Contratos, ainda não construído", mas Contratos existe desde a
 * Sprint 7 e já liga Motorista↔Veículo (`contrato.veiculo_id`/`contrato.motorista_id`).
 * Reaproveita a mesma regra do Veículo (não duplica lógica) — o veículo em questão é o do
 * contrato ativo do motorista ou, na ausência de um ativo, o mais recente (useDriverIntelligence
 * decide qual). `null` continua sendo o resultado honesto quando o motorista nunca teve
 * nenhum contrato.
 */
export function calcularSaudePatrimonial(input: SaudePatrimonialInput): CategoriaHealthResult {
  if (!input.veiculo) {
    return {
      categoria: 'patrimonial',
      label: 'Saúde Patrimonial',
      score: null,
      status: 'sem_dado',
      motivos: ['Nenhum veículo vinculado por contrato ainda — sem ativo para avaliar.'],
    };
  }

  return calcularSaudePatrimonialVeiculo({ veiculo: input.veiculo });
}
