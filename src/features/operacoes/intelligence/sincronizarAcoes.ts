import type { Motorista } from '@/features/motoristas/types';
import type { ContratoComRelacoes } from '@/features/contracts/types';
import type { PagamentoComRelacoes } from '@/features/financeiro/types';
import { gerarAcoesCnhVencendo } from './geradores/motoristaGeradores';
import { gerarAcoesContratoVencendo } from './geradores/contratoGeradores';
import { gerarAcoesPagamentoAtrasado } from './geradores/financeiroGeradores';
import type { AcaoCandidata } from '../types';

export type MontarCandidatasInput = {
  motoristas: Motorista[];
  contratos: ContratoComRelacoes[];
  pagamentosPendentes: PagamentoComRelacoes[];
};

// Função pura (DEC-055) — junta o resultado dos 3 geradores desta sprint. Um quarto
// gerador futuro (ex. Inspection, OBD2) só precisa ser adicionado aqui, sem mexer em nada
// mais — este é o ponto de extensão que substitui um "Automation Engine" genérico.
export function montarCandidatas(input: MontarCandidatasInput): AcaoCandidata[] {
  return [
    ...gerarAcoesCnhVencendo(input.motoristas),
    ...gerarAcoesContratoVencendo(input.contratos),
    ...gerarAcoesPagamentoAtrasado(input.pagamentosPendentes),
  ];
}
