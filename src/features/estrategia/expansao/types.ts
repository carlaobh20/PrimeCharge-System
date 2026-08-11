import type { SistemaAmortizacao } from '@/shared/lib/amortizacao';

// Épico 9 — Motor de Expansão da Frota, Fase 1.

export type CenarioExpansao = {
  id: string;
  empresa_id: string;
  nome: string;
  capital_disponivel: number;
  reserva_minima: number;
  preco_veiculo: number;
  entrada_por_veiculo: number;
  taxa_juros_am_pct: number;
  prazo_financiamento_meses: number;
  sistema_amortizacao: SistemaAmortizacao;
  aluguel_semanal_por_veiculo: number;
  ocupacao_pct: number;
  km_mensal_por_veiculo: number;
  seguro_mensal_por_veiculo: number;
  ipva_anual_por_veiculo: number;
  rastreador_mensal_por_veiculo: number;
  manutencao_por_km: number;
  contador_mensal: number;
  aliquota_tributos_pct: number;
  horizonte_meses: 12 | 24 | 36 | 60;
  venda_programada_mes: number | null;
  venda_valor_estimado: number | null;
  venda_custos_pct: number;
  dscr_minimo_saudavel: number;
  dscr_minimo_atencao: number;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type CenarioExpansaoInput = Omit<CenarioExpansao, 'id' | 'empresa_id' | 'criado_por' | 'criado_em' | 'atualizado_em'>;

export type EstrategiaExpansao = 'conservadora' | 'balanceada' | 'agressiva';

export const ESTRATEGIA_LABEL: Record<EstrategiaExpansao, string> = {
  conservadora: 'Conservadora',
  balanceada: 'Balanceada',
  agressiva: 'Agressiva',
};
