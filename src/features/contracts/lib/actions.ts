import {
  AlertTriangle,
  Ban,
  Camera,
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
  // "ativar" não é uma Command Action visível (não entra em COMMAND_ACTIONS) — é um estado
  // interno de `activeAction` disparado programaticamente por handleTransition quando a
  // transição assinado→ativo precisa capturar km/carga da entrega primeiro (Missão 4, ver
  // AtivarContratoDialog). Mesma lista de ActionKey porque activeAction é tipado por ela.
  | 'ativar'
  | 'renovar'
  | 'encerrar'
  | 'cancelar'
  | 'documento'
  | 'comentario'
  | 'tag'
  | 'pagamento'
  | 'atraso'
  | 'compartilhar'
  | 'enviar'
  // "Exportar PDF" (ContratoSidebar) chamava 'enviar' por engano — mesmo bug de copy-paste que
  // levou 'relatorio' a existir em frota/motoristas/lib/actions.ts mas nunca em contracts/. Missão
  // 4 (Fase 9, auditoria de UX): corrigido para o mesmo placeholder honesto dos outros dois Cockpits.
  | 'relatorio';

export const COMMAND_ACTIONS: { key: ActionKey; label: string; icon: LucideIcon; real: boolean }[] = [
  { key: 'status', label: 'Alterar status', icon: Repeat, real: true },
  { key: 'renovar', label: 'Renovar contrato', icon: Repeat, real: true },
  { key: 'encerrar', label: 'Encerrar contrato', icon: XCircle, real: true },
  { key: 'cancelar', label: 'Cancelar contrato', icon: Ban, real: true },
  { key: 'documento', label: 'Adicionar documento', icon: FileText, real: true },
  { key: 'comentario', label: 'Novo comentário', icon: MessageSquarePlus, real: true },
  { key: 'tag', label: 'Nova tag', icon: Tags, real: true },
  { key: 'pagamento', label: 'Registrar pagamento', icon: Receipt, real: true },
  // "atraso" virou ação real na Missão 4 (Fase 9, auditoria de UX) — navega direto para
  // /financeiro/pagamentos (mesmo padrão de 'pagamento' e de 'cobranca' em motoristas/lib/actions.ts),
  // em vez de abrir um placeholder que só explicava e não levava lá.
  { key: 'atraso', label: 'Registrar atraso', icon: AlertTriangle, real: true },
  { key: 'compartilhar', label: 'Compartilhar contrato', icon: Copy, real: true },
  { key: 'enviar', label: 'Enviar contrato', icon: Send, real: false },
  { key: 'relatorio', label: 'Gerar relatório', icon: Camera, real: false },
];

export const PLACEHOLDER_DESCRIPTIONS: Partial<Record<ActionKey, string>> = {
  enviar: 'Envio automático (e-mail/WhatsApp) depende da estratégia de notificações, planejada para a Fase 8 — hoje o compartilhamento é por link direto.',
  relatorio: 'Geração de relatório/PDF deste contrato ainda não foi construída.',
};
