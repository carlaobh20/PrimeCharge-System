import {
  AlertTriangle,
  Ban,
  Camera,
  Car,
  FileSignature,
  FileText,
  MessageSquarePlus,
  Receipt,
  Repeat,
  Tags,
  type LucideIcon,
} from 'lucide-react';

// Command Actions do Cockpit do Motorista (Sprint 6) — mesmo padrão de
// features/frota/lib/actions.ts: ações hardcoded, sem "Action Registry" genérico
// (DEC-021 / DEC-010: motor genérico só se justifica com 3 casos reais repetidos).
export type ActionKey =
  | 'status'
  | 'documento'
  | 'comentario'
  | 'tag'
  | 'bloquear'
  | 'vincular-veiculo'
  | 'contrato'
  | 'cobranca'
  | 'ocorrencia'
  | 'relatorio';

export const COMMAND_ACTIONS: { key: ActionKey; label: string; icon: LucideIcon; real: boolean }[] = [
  { key: 'documento', label: 'Adicionar documento', icon: FileText, real: true },
  { key: 'status', label: 'Alterar status', icon: Repeat, real: true },
  { key: 'comentario', label: 'Novo comentário', icon: MessageSquarePlus, real: true },
  { key: 'tag', label: 'Nova tag', icon: Tags, real: true },
  { key: 'bloquear', label: 'Bloquear motorista', icon: Ban, real: true },
  { key: 'vincular-veiculo', label: 'Vincular veículo', icon: Car, real: false },
  { key: 'contrato', label: 'Novo contrato', icon: FileSignature, real: false },
  { key: 'cobranca', label: 'Registrar cobrança', icon: Receipt, real: false },
  { key: 'ocorrencia', label: 'Registrar ocorrência', icon: AlertTriangle, real: false },
  { key: 'relatorio', label: 'Gerar relatório', icon: Camera, real: false },
];

export const PLACEHOLDER_DESCRIPTIONS: Partial<Record<ActionKey, string>> = {
  'vincular-veiculo': 'A vinculação Motorista↔Veículo depende do módulo de Contratos, ainda não construído — vai definir qual ativo cada motorista está usando hoje.',
  contrato: 'O módulo de Contratos ainda não existe — quando for construído, cada contrato deste motorista aparece aqui e alimenta os KPIs de Receita gerada, Tempo médio de contrato e Lifetime Value.',
  cobranca: 'Registro de cobrança depende do módulo Financeiro, ainda não construído — vai alimentar o KPI de Inadimplência.',
  ocorrencia: 'Registro de ocorrência (multa, sinistro, avaria) ainda não foi construído — vai alimentar o Health Score e os Riscos deste motorista.',
  relatorio: 'Geração de relatório/PDF deste motorista ainda não foi construída.',
};
