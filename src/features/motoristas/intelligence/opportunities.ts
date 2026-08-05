import type { Motorista } from '../types';
import type { Opportunity } from './types';

export type OpportunitiesInput = {
  motorista: Pick<Motorista, 'id' | 'status'>;
  totalDocumentos: number;
  diasAteVencimentoCnh: number | null;
};

// Regra única e estreita, mesmo espírito de gerarOportunidades (Veículo, DEC-025): motorista
// em análise, com documentação completa (2+ documentos e CNH válida cadastrada) está pronto
// para avançar no funil — não fabrica oportunidade sobre dado ausente.
export function gerarOportunidades(input: OpportunitiesInput): Opportunity[] {
  const { motorista, totalDocumentos, diasAteVencimentoCnh } = input;
  if (motorista.status !== 'em_analise') return [];
  if (totalDocumentos < 2) return [];
  if (diasAteVencimentoCnh === null || diasAteVencimentoCnh < 0) return [];

  return [
    {
      id: 'pronto-para-avancar',
      texto: 'Documentação completa e CNH válida — pronto para avançar para Ativo.',
      categoria: 'documental',
    },
  ];
}
