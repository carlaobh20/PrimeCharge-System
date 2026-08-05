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
//
// "vincular-veiculo" e "contrato" viraram ações reais na Sprint 7, quando o módulo de
// Contratos passou a existir — e apontam pro MESMO destino (/contratos/novo com
// motoristaId pré-preenchido), não pra dois fluxos separados: DEC-006 já decidiu que não
// existe "vínculo" motorista↔veículo fora de um contrato, então "vincular um veículo" e
// "criar um contrato" são a mesma operação de negócio vista por dois rótulos diferentes
// (alguém pensa "quero vincular um carro a esse motorista", outra pessoa pensa "quero criar
// um contrato") — duplicar a tela por trás violaria DEC-023 (nunca copiar código/fluxo).
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
  { key: 'vincular-veiculo', label: 'Vincular veículo', icon: Car, real: true },
  { key: 'contrato', label: 'Novo contrato', icon: FileSignature, real: true },
  { key: 'cobranca', label: 'Registrar cobrança', icon: Receipt, real: false },
  { key: 'ocorrencia', label: 'Registrar ocorrência', icon: AlertTriangle, real: false },
  { key: 'relatorio', label: 'Gerar relatório', icon: Camera, real: false },
];

export const PLACEHOLDER_DESCRIPTIONS: Partial<Record<ActionKey, string>> = {
  cobranca: 'Registro de cobrança depende do módulo Financeiro, ainda não construído — vai alimentar o KPI de Inadimplência.',
  ocorrencia: 'Registro de ocorrência (multa, sinistro, avaria) ainda não foi construído — vai alimentar o Health Score e os Riscos deste motorista.',
  relatorio: 'Geração de relatório/PDF deste motorista ainda não foi construída.',
};
