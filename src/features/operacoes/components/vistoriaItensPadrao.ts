// Épico 8 — checklist mínimo padrão de vistoria (ETAPA 9). Mesma lista para entrega e
// devolução (mesmo `descricao` nas duas) — é o que permite comparar item a item (ver
// VistoriaComparacaoView) sem depender de correspondência aproximada de texto.
// Deliberadamente curto (15 itens): "não criar uma lista enorme apenas por precaução".
// odômetro, carga, fotos gerais e assinatura NÃO entram aqui — já são campos estruturados
// próprios da vistoria (checklists.odometro_km/carga_pct/assinatura_url + capability
// `arquivos`), não itens de checklist.
export const VISTORIA_ITENS_PADRAO: { categoria: string; descricao: string }[] = [
  { categoria: 'Exterior', descricao: 'Pintura e lataria' },
  { categoria: 'Exterior', descricao: 'Para-choques' },
  { categoria: 'Exterior', descricao: 'Vidros e retrovisores' },
  { categoria: 'Exterior', descricao: 'Rodas e pneus' },
  { categoria: 'Exterior', descricao: 'Faróis e lanternas' },
  { categoria: 'Interior', descricao: 'Bancos e estofados' },
  { categoria: 'Interior', descricao: 'Painel e comandos' },
  { categoria: 'Interior', descricao: 'Cintos de segurança' },
  { categoria: 'Interior', descricao: 'Multimídia' },
  { categoria: 'Interior', descricao: 'Ar-condicionado' },
  { categoria: 'Equipamentos', descricao: 'Cabo de carregamento' },
  { categoria: 'Equipamentos', descricao: 'Chave/cartão do veículo' },
  { categoria: 'Equipamentos', descricao: 'Kit ferramentas / macaco' },
  { categoria: 'Elétrico', descricao: 'Bateria de tração' },
  { categoria: 'Elétrico', descricao: 'Alertas no painel' },
];
