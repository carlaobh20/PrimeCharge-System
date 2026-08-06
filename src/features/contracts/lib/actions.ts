import {
  AlertTriangle,
  Ban,
  Copy,
  FileText,
  MessageSquarePlus,
  Receipt,
  Repeat,
  Send,
  Tags,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

// Command Actions do Cockpit do Contrato (Sprint 7) — mesmo padrão de features/frota/lib/actions.ts
// e features/motoristas/lib/actions.ts: ações hardcoded, sem "Action Registry" genérico
// (DEC-021/DEC-010: motor genérico só se justifica com 3 casos reais repetidos — aqui já são 3
// módulos com a mesma lista hardcoded, e ainda assim nenhum motor foi extraído, porque o
// conteúdo de cada lista é sempre específico do domínio; o que se repete é só a forma de
// declarar, não uma regra reutilizável).
export type ActionKey =
  | 'status'
  | 'renovar'
  | 'encerrar'
  | 'cancelar'
  | 'documento'
  | 'comentario'
  | 'tag'
  | 'pagamento'
  | 'atraso'
  | 'compartilhar'
  | 'enviar';

export const COMMAND_ACTIONS: { key: ActionKey; label: string; icon: LucideIcon; real: boolean }[] = [
  { key: 'status', label: 'Alterar status', icon: Repeat, real: true },
  { key: 'renovar', label: 'Renovar contrato', icon: Repeat, real: true },
  { key: 'encerrar', label: 'Encerrar contrato', icon: XCircle, real: true },
  { key: 'cancelar', label: 'Cancelar contrato', icon: Ban, real: true },
  { key: 'documento', label: 'Adicionar documento', icon: FileText, real: true },
  { key: 'comentario', label: 'Novo comentário', icon: MessageSquarePlus, real: true },
  { key: 'tag', label: 'Nova tag', icon: Tags, real: true },
  { key: 'pagamento', label: 'Registrar pagamento', icon: Receipt, real: true },
  { key: 'atraso', label: 'Registrar atraso', icon: AlertTriangle, real: false },
  { key: 'compartilhar', label: 'Compartilhar contrato', icon: Copy, real: true },
  { key: 'enviar', label: 'Enviar contrato', icon: Send, real: false },
];

export const PLACEHOLDER_DESCRIPTIONS: Partial<Record<ActionKey, string>> = {
  atraso: 'Registro de atraso é sempre calculado (pagamento pendente com data prevista vencida), não um botão manual — acompanhe em Pagamentos.',
  enviar: 'Envio automático (e-mail/WhatsApp) depende da estratégia de notificações, planejada para a Fase 8 — hoje o compartilhamento é por link direto.',
};
