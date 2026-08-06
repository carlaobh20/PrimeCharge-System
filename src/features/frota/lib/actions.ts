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
  ShieldAlert,
  Tags,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

// Command Actions do Cockpit do Ativo (Sprint 2). Cada ação é hardcoded — de propósito,
// sem "Action Registry" genérico (ver DEC-021 / DEC-010: motor genérico só com 3 casos reais).
export type ActionKey =
  | 'manutencao'
  | 'multa'
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

// "manutencao" virou ação real na Missão 4: a aba Manutenções já existia desde a Missão 2,
// mas o atalho aqui ainda abria um placeholder dizendo "o módulo ainda não existe" — achado
// #13 da auditoria de jornada (texto desatualizado, não gap funcional). "multa" é ação real
// nova (achado #12 — único ponto da jornada sem nenhuma infraestrutura antes desta missão).
export const COMMAND_ACTIONS: { key: ActionKey; label: string; icon: LucideIcon; real: boolean }[] = [
  { key: 'manutencao', label: 'Registrar manutenção', icon: Wrench, real: true },
  { key: 'multa', label: 'Registrar multa', icon: ShieldAlert, real: true },
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
  abastecimento: 'Registro de abastecimento/recarga depende do módulo Financeiro/Operações — sem um segundo caso de uso real ainda que justifique uma tela própria (Regra dos 3); hoje entra como Lançamento genérico.',
  relatorio: 'Geração de relatório/PDF deste veículo ainda não foi construída.',
  arquivar: 'Arquivamento (retirar da frota ativa sem excluir o histórico) ainda não foi construído — hoje o único jeito de remover um veículo é excluir.',
};
