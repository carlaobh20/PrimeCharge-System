// Tipos do Centro de Estratégia — espelha supabase/migrations/0014_epico2_politicas_empresa.sql.
//
// `politicas_empresa` nasce genérica de propósito (ver comentário da migration): hoje só o
// Centro de Estratégia lê/escreve isto, mas o dado em si (e o nome da tabela) já é pensado
// para Centro de Operações/Motor de Recomendações/Automações lerem no futuro, sem precisar de
// uma segunda tabela. `outras_politicas` é a válvula de escape — qualquer política que ainda
// não tem coluna própria mora ali, `chave -> number`.
export type PoliticasEmpresa = {
  id: string;
  empresa_id: string;

  roi_minimo_pct: number | null;
  payback_maximo_meses: number | null;
  caixa_minimo_meses: number | null;
  capital_reserva_valor: number | null;
  alavancagem_maxima_pct: number | null;
  financiamento_maximo_pct: number | null;

  estoque_maximo_pct: number | null;
  marketing_maximo_pct: number | null;
  tecnologia_maximo_pct: number | null;
  expansao_maximo_pct: number | null;

  meta_ocupacao_pct: number | null;
  meta_inadimplencia_maxima_pct: number | null;
  meta_margem_liquida_pct: number | null;
  meta_crescimento_anual_pct: number | null;

  outras_politicas: Record<string, number>;

  atualizado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export const CAMPOS_POLITICAS_TIPADOS = [
  'roi_minimo_pct',
  'payback_maximo_meses',
  'caixa_minimo_meses',
  'capital_reserva_valor',
  'alavancagem_maxima_pct',
  'financiamento_maximo_pct',
  'estoque_maximo_pct',
  'marketing_maximo_pct',
  'tecnologia_maximo_pct',
  'expansao_maximo_pct',
  'meta_ocupacao_pct',
  'meta_inadimplencia_maxima_pct',
  'meta_margem_liquida_pct',
  'meta_crescimento_anual_pct',
] as const;

export type CampoPoliticaTipado = (typeof CAMPOS_POLITICAS_TIPADOS)[number];

export const LABEL_POLITICA: Record<CampoPoliticaTipado, string> = {
  roi_minimo_pct: 'ROI mínimo (%)',
  payback_maximo_meses: 'Payback máximo (meses)',
  caixa_minimo_meses: 'Caixa mínimo (meses de operação)',
  capital_reserva_valor: 'Capital de reserva (R$)',
  alavancagem_maxima_pct: 'Alavancagem máxima (%)',
  financiamento_maximo_pct: 'Financiamento máximo (% da frota)',
  estoque_maximo_pct: 'Máximo em estoque (%)',
  marketing_maximo_pct: 'Máximo em marketing (%)',
  tecnologia_maximo_pct: 'Máximo em tecnologia (%)',
  expansao_maximo_pct: 'Máximo em expansão (%)',
  meta_ocupacao_pct: 'Meta de ocupação da frota (%)',
  meta_inadimplencia_maxima_pct: 'Inadimplência máxima aceitável (%)',
  meta_margem_liquida_pct: 'Meta de margem líquida (%)',
  meta_crescimento_anual_pct: 'Meta de crescimento anual (%)',
};

export type PoliticasEmpresaInput = Partial<Record<CampoPoliticaTipado, number | null>>;
