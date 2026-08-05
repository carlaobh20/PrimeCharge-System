import {
  Archive,
  Camera,
  Copy,
  DollarSign,
  FileText,
  Fuel,
  Gauge,
  MessageSquarePlus,
  Repeat,
  Tags,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

// Command Actions do Cockpit do Ativo (Sprint 2). Cada ação é hardcoded — de propósito,
// sem "Action Registry" genérico (ver DEC-021 / DEC-010: motor genérico só com 3 casos reais).
export type ActionKey =
  | 'manutencao'
  | 'documento'
  | 'status'
  | 'comentario'
  | 'tag'
  | 'km'
  | 'abastecimento'
  | 'relatorio'
  | 'duplicar'
  | 'vender'
  | 'arquivar';

export const COMMAND_ACTIONS: { key: ActionKey; label: string; icon: LucideIcon; real: boolean }[] = [
  { key: 'manutencao', label: 'Registrar manutenção', icon: Wrench, real: false },
  { key: 'documento', label: 'Adicionar documento', icon: FileText, real: true },
  { key: 'status', label: 'Alterar status', icon: Repeat, real: true },
  { key: 'comentario', label: 'Novo comentário', icon: MessageSquarePlus, real: true },
  { key: 'tag', label: 'Nova tag', icon: Tags, real: true },
  { key: 'km', label: 'Registrar km', icon: Gauge, real: true },
  { key: 'abastecimento', label: 'Registrar abastecimento', icon: Fuel, real: false },
  { key: 'relatorio', label: 'Gerar relatório', icon: Camera, real: false },
  { key: 'duplicar', label: 'Duplicar veículo', icon: Copy, real: true },
  { key: 'vender', label: 'Vender veículo', icon: DollarSign, real: true },
  { key: 'arquivar', label: 'Arquivar', icon: Archive, real: false },
];

export const PLACEHOLDER_DESCRIPTIONS: Partial<Record<ActionKey, string>> = {
  manutencao: 'O módulo de Manutenção ainda não existe — quando for construído, cada ordem de serviço aparece aqui e alimenta os KPIs de Saúde do ativo e Custo acumulado.',
  abastecimento: 'Registro de abastecimento depende do módulo Financeiro/Operações, ainda não construído — vai alimentar Custo acumulado e ROI.',
  relatorio: 'Geração de relatório/PDF deste veículo ainda não foi construída.',
  arquivar: 'Arquivamento (retirar da frota ativa sem excluir o histórico) ainda não foi construído — hoje o único jeito de remover um veículo é excluir.',
};
