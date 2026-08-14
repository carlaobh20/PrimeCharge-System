// Épico 4 — "Ativo Financeiro", Parte 6. Mapeia os 10 valores reais de `veiculo_status`
// (migration 0003, state machine em fn_validar_transicao_veiculo) para os 8 estágios que a
// missão pediu no Ciclo de Vida. NÃO migra/renomeia o enum do banco — auditoria prévia (Épico 4)
// achou que `veiculo_status` está referenciado por múltiplos filtros operacionais (ex.
// useFilasDeTrabalho) e por um trigger de validação de transição; trocar o enum é risco alto
// para um ganho puramente visual. Em vez disso, esta é só uma tabela de tradução.
import type { VeiculoStatus } from '../types';

export type EstagioCicloVida =
  | 'planejamento'
  | 'compra'
  | 'documentacao'
  | 'disponivel'
  | 'alugado'
  | 'manutencao'
  | 'revenda'
  | 'encerrado';

export const ESTAGIOS_CICLO_VIDA: EstagioCicloVida[] = [
  'planejamento',
  'compra',
  'documentacao',
  'disponivel',
  'alugado',
  'manutencao',
  'revenda',
  'encerrado',
];

export const ESTAGIO_CICLO_VIDA_LABEL: Record<EstagioCicloVida, string> = {
  planejamento: 'Planejamento',
  compra: 'Compra',
  documentacao: 'Documentação',
  disponivel: 'Disponível',
  alugado: 'Alugado',
  manutencao: 'Manutenção',
  revenda: 'Revenda',
  encerrado: 'Encerrado',
};

// Decisões de mapeamento que não são 1:1 óbvias:
// - 'reservado' → disponível: ainda não saiu do pátio, reserva é um sub-estado de disponibilidade.
// - 'devolvido' → alugado: acabou de voltar de um aluguel, é o fechamento daquele ciclo, não uma
//   fase nova — o próximo status real (manutencao ou disponivel) que muda o estágio.
export const VEICULO_STATUS_PARA_ESTAGIO: Record<VeiculoStatus, EstagioCicloVida> = {
  novo: 'planejamento',
  comprado: 'compra',
  preparacao: 'documentacao',
  disponivel: 'disponivel',
  reservado: 'disponivel',
  alugado: 'alugado',
  devolvido: 'alugado',
  manutencao: 'manutencao',
  venda: 'revenda',
  encerrado: 'encerrado',
};

export function estagioCicloVida(status: VeiculoStatus): EstagioCicloVida {
  return VEICULO_STATUS_PARA_ESTAGIO[status];
}
