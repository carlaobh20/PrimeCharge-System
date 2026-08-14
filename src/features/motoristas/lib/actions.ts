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
  Smartphone,
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
  | 'relatorio'
  | 'acesso-portal';

// "cobranca" e "ocorrencia" viraram ações reais na Missão 4 (Fase 1, achado de texto stale +
// achado #12 da auditoria de jornada): o módulo Financeiro/Pagamentos existe desde a Missão 2
// (o texto antigo dizia "ainda não construído"), e "ocorrência" agora abre o registro real de
// Multa (única infraestrutura que a jornada tinha; sinistro/avaria continuam sem tela própria
// — Regra dos 3, sem um segundo caso de uso real ainda).
export const COMMAND_ACTIONS: { key: ActionKey; label: string; icon: LucideIcon; real: boolean }[] = [
  { key: 'documento', label: 'Adicionar documento', icon: FileText, real: true },
  { key: 'status', label: 'Alterar status', icon: Repeat, real: true },
  { key: 'comentario', label: 'Novo comentário', icon: MessageSquarePlus, real: true },
  { key: 'tag', label: 'Nova tag', icon: Tags, real: true },
  { key: 'bloquear', label: 'Bloquear motorista', icon: Ban, real: true },
  { key: 'vincular-veiculo', label: 'Vincular veículo', icon: Car, real: true },
  { key: 'contrato', label: 'Novo contrato', icon: FileSignature, real: true },
  { key: 'cobranca', label: 'Registrar cobrança', icon: Receipt, real: true },
  { key: 'ocorrencia', label: 'Registrar multa', icon: AlertTriangle, real: true },
  { key: 'acesso-portal', label: 'Criar acesso ao portal', icon: Smartphone, real: true },
  { key: 'relatorio', label: 'Gerar relatório', icon: Camera, real: false },
];

export const PLACEHOLDER_DESCRIPTIONS: Partial<Record<ActionKey, string>> = {
  relatorio: 'Geração de relatório/PDF deste motorista ainda não foi construída.',
};
