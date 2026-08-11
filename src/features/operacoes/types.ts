// Tipos do módulo Operações — espelha supabase/migrations/0007_plataforma_operacoes.sql.
// `tipo` é string livre por decisão (DEC-055) — cada gerador/Engine futura (Inspection,
// OBD2, Driver Program...) introduz um valor novo sem migration. `status`/`prioridade`/
// `origem` são enums fechados (ciclo de vida real, ver CORE_CONCEPTS.md seção 6).

export type AcaoStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
export type AcaoPrioridade = 'baixa' | 'media' | 'alta' | 'critica';
// 'sistema' = gerado por um gerador desta sprint, sob demanda (sem cron). 'automacao' fica
// reservado para quando pg_cron existir de verdade (Fase 8, DEC-058) — nenhum gerador desta
// sprint produz 'automacao'/'agente'/'ia' ainda, mas o schema já aceita (DEC-058).
export type AcaoOrigem = 'manual' | 'sistema' | 'automacao' | 'agente' | 'ia';

export type ChecklistStatus = 'aberto' | 'concluido' | 'cancelado';

// Épico 8 — tipo real de vistoria (migration 0022, nunca persistido pelo frontend até agora).
export type ChecklistTipo = 'entrega' | 'devolucao' | 'renovacao' | 'manutencao' | 'sinistro';

export const CHECKLIST_TIPO_LABEL: Record<ChecklistTipo, string> = {
  entrega: 'Entrega',
  devolucao: 'Devolução',
  renovacao: 'Renovação',
  manutencao: 'Manutenção',
  sinistro: 'Sinistro',
};

export type AcaoOperacional = {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  status: AcaoStatus;
  prioridade: AcaoPrioridade;
  origem: AcaoOrigem;
  responsavel_id: string | null;
  prazo: string | null;
  entidade_tipo: string | null;
  entidade_id: string | null;
  gerado_por: string | null;
  concluida_em: string | null;
  concluida_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type AcaoOperacionalComRelacoes = AcaoOperacional & {
  responsavel: { id: string; nome_completo: string | null } | null;
};

// Candidata a Ação, produzida por um gerador (funções puras em intelligence/geradores/) —
// ainda não persistida. `sincronizarAcoes` decide o que inserir/fechar comparando isto
// contra o que já existe em aberto (ver DEC-055).
export type AcaoCandidata = {
  titulo: string;
  descricao?: string;
  tipo: string;
  prioridade: AcaoPrioridade;
  prazo: string | null;
  entidade_tipo: string;
  entidade_id: string;
  gerado_por: string;
};

export type ChecklistItem = {
  id: string;
  checklist_id: string;
  ordem: number;
  descricao: string;
  obrigatorio: boolean;
  resposta: boolean | null;
  observacao: string | null;
  foto_url: string | null;
  // Épico 8 — terceiro estado do item ("não se aplica"). false = fora da exigência de
  // resposta/foto deste item, independente de `obrigatorio`.
  aplicavel: boolean;
  respondido_por: string | null;
  respondido_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type Checklist = {
  id: string;
  empresa_id: string;
  titulo: string;
  status: ChecklistStatus;
  entidade_tipo: string;
  entidade_id: string;
  responsavel_id: string | null;
  concluido_em: string | null;
  concluido_por: string | null;
  criado_em: string;
  atualizado_em: string;
  // Épico 8 — vistoria real (migration 0030). tipo/odometro_km/carga_pct/assinatura_url já
  // existiam desde 0010/0022, sem UI até agora.
  tipo: ChecklistTipo | null;
  odometro_km: number | null;
  carga_pct: number | null;
  assinatura_url: string | null;
  checklist_anterior_id: string | null;
  contrato_id: string | null;
  motorista_id: string | null;
  observacoes: string | null;
  destino_veiculo: string | null;
  houve_sinistro: boolean;
  confirmacao_motorista: boolean;
};

export type ChecklistComItens = Checklist & { itens: ChecklistItem[] };

export const ACAO_STATUS_LABEL: Record<AcaoStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

// Espelha fn_validar_transicao_acao (migration 0007).
export const ACAO_STATUS_TRANSITIONS: Record<AcaoStatus, AcaoStatus[]> = {
  pendente: ['em_andamento', 'concluida', 'cancelada'],
  em_andamento: ['concluida', 'cancelada'],
  concluida: [],
  cancelada: [],
};

export const ACAO_PRIORIDADE_LABEL: Record<AcaoPrioridade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

export const ACAO_ORIGEM_LABEL: Record<AcaoOrigem, string> = {
  manual: 'Manual',
  sistema: 'Sistema',
  automacao: 'Automação',
  agente: 'Agente',
  ia: 'IA',
};

export const CHECKLIST_STATUS_LABEL: Record<ChecklistStatus, string> = {
  aberto: 'Aberto',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

// Espelha fn_validar_transicao_checklist (migration 0007).
export const CHECKLIST_STATUS_TRANSITIONS: Record<ChecklistStatus, ChecklistStatus[]> = {
  aberto: ['concluido', 'cancelado'],
  concluido: [],
  cancelado: [],
};

// Manutenções — Missão 2 (Operação Real), migration 0010. Mora em `operacoes/` pelo mesmo
// motivo de Checklists (DEC-059/DEC-073): é uma capability operacional que aparece no
// Cockpit do Veículo, mas não é dado estrutural do módulo Veículos em si. Sem policy de
// DELETE de UI ainda — reaproveita `pode('veiculos', ...)`, sem módulo de permissão próprio
// (regra dos 3 — não há ainda um segundo consumidor que justifique um módulo dedicado).
export type ManutencaoTipo = 'preventiva' | 'corretiva' | 'outro';

// status_execucao/data_agendada — Missão 4 (Fase 3): antes desta migration, manutencoes só
// registrava o que JÁ tinha acontecido (data_execucao obrigatória) — não existia "manutenção
// pendente" como estado possível, o que tornava impossível atender o pedido explícito da
// missão de mostrar "manutenções pendentes" no painel operacional. `data_execucao` continua
// obrigatória quando `status_execucao = 'realizada'` (constraint no banco, migration 0012).
export type ManutencaoStatusExecucao = 'agendada' | 'realizada' | 'cancelada';

export type Manutencao = {
  id: string;
  empresa_id: string;
  veiculo_id: string;
  tipo: ManutencaoTipo;
  descricao: string;
  oficina: string | null;
  km: number | null;
  custo: number | null;
  data_execucao: string | null;
  data_agendada: string | null;
  status_execucao: ManutencaoStatusExecucao;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export const MANUTENCAO_TIPO_LABEL: Record<ManutencaoTipo, string> = {
  preventiva: 'Preventiva',
  corretiva: 'Corretiva',
  outro: 'Outro',
};

export const MANUTENCAO_STATUS_EXECUCAO_LABEL: Record<ManutencaoStatusExecucao, string> = {
  agendada: 'Agendada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
};

// ============================================================
// Multas — Missão 4 (Fase 1, achado #12 da auditoria de jornada): único ponto da jornada
// operacional sem NENHUMA infraestrutura (nem campo, nem tela) — diferente de itens
// conscientemente recusados (Battery Intelligence, Marketplace), "multa" nunca tinha sido
// avaliado, era só um placeholder herdado da Sprint 6. Mora em `operacoes/` pelo mesmo
// motivo de Manutenções/Checklists — capability operacional exibida no Cockpit do Veículo
// (e, em modo leitura, no do Motorista), sem módulo de permissão próprio (reaproveita
// `pode('veiculos', ...)`, mesmo racional de Manutenções — Regra dos 3).
// ============================================================

export type MultaStatus = 'pendente' | 'paga' | 'recorrida' | 'cancelada';

export type Multa = {
  id: string;
  empresa_id: string;
  veiculo_id: string;
  motorista_id: string | null;
  contrato_id: string | null;
  orgao_autuador: string;
  descricao: string;
  data_infracao: string;
  data_vencimento: string | null;
  valor: number | null;
  pontos: number | null;
  status: MultaStatus;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type MultaComRelacoes = Multa & {
  veiculo?: { id: string; placa: string } | null;
  motorista?: { id: string; nome_completo: string } | null;
};

export const MULTA_STATUS_LABEL: Record<MultaStatus, string> = {
  pendente: 'Pendente',
  paga: 'Paga',
  recorrida: 'Recorrida',
  cancelada: 'Cancelada',
};
