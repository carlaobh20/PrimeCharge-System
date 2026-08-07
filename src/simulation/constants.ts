// Missão 7 — Modo Simulação: IDs fixos reusados entre o gerador de dataset e os side effects
// (réplica de trigger). Todos com prefixo próprio, fora do espaço de UUID real de produção —
// não há nenhuma chance de colisão com um ID real (ver DEC de isolamento no relatório final).

export const SIMULATION_EMPRESA_ID = 'e0000000-0000-0000-0000-000000000001';
export const SIMULATION_CENTRO_CUSTO_OPERACAO_ID = 'c0000000-0000-0000-0000-000000000001';
export const SIMULATION_CENTRO_CUSTO_MANUTENCAO_ID = 'c0000000-0000-0000-0000-000000000002';
export const SIMULATION_CENTRO_CUSTO_ADMIN_ID = 'c0000000-0000-0000-0000-000000000003';
export const SIMULATION_CONTA_OPERACIONAL_ID = 'b0000000-0000-0000-0000-000000000001';
export const SIMULATION_CONTA_RESERVA_ID = 'b0000000-0000-0000-0000-000000000002';
