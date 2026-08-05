import type { ContratoStatus } from '../types';
import type { Opportunity } from './types';

export type OpportunitiesInput = {
  status: ContratoStatus;
  diasAteVencimento: number | null;
  motoristaStatus: string;
};

// Regra única e estreita, mesmo espírito de gerarOportunidades (Veículo/Motorista, DEC-025):
// contrato ativo se aproximando do fim, com motorista em bom histórico (status "ativo", não
// bloqueado/inativo), é oportunidade real de renovação — não fabrica oportunidade sobre dado
// ausente ou motorista com sinal de risco.
export function gerarOportunidades(input: OpportunitiesInput): Opportunity[] {
  const { status, diasAteVencimento, motoristaStatus } = input;
  if (status !== 'ativo') return [];
  if (diasAteVencimento === null || diasAteVencimento < 0 || diasAteVencimento > 30) return [];
  if (motoristaStatus !== 'ativo') return [];

  return [
    {
      id: 'oportunidade-renovacao',
      texto: `Contrato vence em ${diasAteVencimento} dias e o motorista está com status Ativo — boa oportunidade de renovação.`,
      categoria: 'comercial',
    },
  ];
}
