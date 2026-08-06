// Modelos de Checklist — Fase 4 da missão "MVP Operacional" (2026-08-06): entrega,
// devolução, vistoria semanal, vistoria extraordinária, troca de motorista.
//
// Isto é conteúdo de UI (uma constante TypeScript), não uma tabela `checklist_templates` —
// DEC-059 já decidiu explicitamente adiar essa tabela até a Sprint 10 (Vistoria Inteligente)
// mostrar, com uso real, qual formato de reuso faz sentido. Um `select` com 5 pontos de
// partida editáveis entrega "checklist realmente utilizável hoje" sem essa tabela: o operador
// escolhe um modelo, os itens entram pré-preenchidos no formulário, e pode editar/adicionar/
// remover livremente antes de salvar — nenhum dado sai fixo no banco.
export type ChecklistModelo = {
  chave: string;
  titulo: string;
  itens: string[];
};

export const CHECKLIST_MODELOS: ChecklistModelo[] = [
  {
    chave: 'entrega',
    titulo: 'Entrega ao motorista',
    itens: [
      'Veículo limpo e higienizado',
      'Carga da bateria registrada',
      'Quilometragem registrada',
      'Fotos do veículo (4 ângulos) anexadas',
      'Documentos do veículo conferidos (CRLV, seguro)',
      'Motorista assinou termo de entrega',
    ],
  },
  {
    chave: 'devolucao',
    titulo: 'Devolução do motorista',
    itens: [
      'Veículo vistoriado sem avarias não registradas',
      'Carga da bateria registrada',
      'Quilometragem registrada',
      'Fotos do veículo (4 ângulos) anexadas',
      'Itens obrigatórios conferidos (cabo de carga, kit)',
      'Motorista assinou termo de devolução',
    ],
  },
  {
    chave: 'vistoria_semanal',
    titulo: 'Vistoria semanal',
    itens: [
      'Estado dos pneus',
      'Nível de fluidos',
      'Estado da carroceria',
      'Funcionamento de faróis e lanternas',
      'Carga da bateria',
    ],
  },
  {
    chave: 'vistoria_extraordinaria',
    titulo: 'Vistoria extraordinária',
    itens: ['Motivo da vistoria registrado', 'Avarias fotografadas', 'Ação corretiva definida'],
  },
  {
    chave: 'troca_motorista',
    titulo: 'Troca de motorista',
    itens: [
      'Motorista anterior devolveu chave/cartão',
      'Vistoria de devolução do motorista anterior concluída',
      'Novo motorista assinou termo de entrega',
      'Quilometragem na troca registrada',
    ],
  },
  {
    chave: 'personalizado',
    titulo: 'Checklist personalizado',
    itens: [],
  },
];
