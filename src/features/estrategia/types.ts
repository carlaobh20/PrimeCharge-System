// Tipos do Centro de Estratégia — espelha supabase/migrations/0014_epico2_politicas_empresa.sql.
//
// `politicas_empresa` nasce genérica de propósito (ver comentário da migration): hoje só o
// Centro de Estratégia lê/escreve isto, mas o dado em si (e o nome da tabela) já é pensado
// para Centro de Operações/Motor de Recomendações/Automações lerem no futuro, sem precisar de
// uma segunda tabela. `outras_politicas` é a válvula de escape — qualquer política que ainda
// não tem coluna própria mora ali, `chave -> number`.
export const LINHAS_DE_NEGOCIO_FUTURAS = [
  'lojinha',
  'wallbox',
  'acessorios',
  'seguros',
  'software',
  'marketplace',
  'franquia',
  'investidores',
  'novas_cidades',
] as const;

export type LinhaDeNegocioFutura = (typeof LINHAS_DE_NEGOCIO_FUTURAS)[number];

export const LABEL_LINHA_DE_NEGOCIO: Record<LinhaDeNegocioFutura, string> = {
  lojinha: 'Lojinha',
  wallbox: 'Vender Wallbox',
  acessorios: 'Vender acessórios',
  seguros: 'Vender seguros',
  software: 'Vender software',
  marketplace: 'Marketplace',
  franquia: 'Franquear a operação',
  investidores: 'Captar investidores',
  novas_cidades: 'Abrir em novas cidades',
};

export type PoliticasEmpresa = {
  id: string;
  empresa_id: string;

  // Épico 3, Missão 1 (Master Plan) — Missão/Visão em texto livre e as frentes de negócio
  // futuras que o proprietário está considerando (checklist, vocabulário fechado — ver
  // migration 0015). Nenhum campo obrigatório: "ainda não defini" é um estado real (DEC-022).
  missao: string | null;
  visao: string | null;
  linhas_de_negocio_futuras: LinhaDeNegocioFutura[];

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

export type PoliticasEmpresaInput = Partial<Record<CampoPoliticaTipado, number | null>> & {
  missao?: string | null;
  visao?: string | null;
  linhas_de_negocio_futuras?: LinhaDeNegocioFutura[];
};

// Épico 3 — Simulação Empresarial (evolução pedida em cima da Timeline de Crescimento).
// Espelha supabase/migrations/0016_epico3_simulacao_empresarial.sql.
export const TIPOS_GATILHO = ['veiculos', 'capital_disponivel', 'caixa', 'lucro', 'roi', 'receita', 'tempo', 'manual'] as const;
export type TipoGatilho = (typeof TIPOS_GATILHO)[number];

export const LABEL_TIPO_GATILHO: Record<TipoGatilho, string> = {
  veiculos: 'Quantidade de veículos',
  capital_disponivel: 'Capital disponível (R$)',
  caixa: 'Caixa acumulado (R$)',
  lucro: 'Lucro mensal (R$)',
  roi: 'ROI acumulado da frota (%)',
  receita: 'Receita mensal (R$)',
  tempo: 'Tempo (meses a partir de hoje)',
  manual: 'Marcação manual (você marca quando acontecer)',
};

export type MarcoCrescimento = {
  id: string;
  empresa_id: string;
  nome: string;
  tipo_gatilho: TipoGatilho;
  /** Obrigatório para todo tipo, exceto 'manual' (que não tem número — o dono marca à mão). */
  valor_gatilho: number | null;
  concluido_manualmente: boolean;
  ativo: boolean;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
};

export type MarcoCrescimentoInput = {
  nome: string;
  tipo_gatilho: TipoGatilho;
  valor_gatilho: number | null;
  ordem?: number;
};

// Central de Decisão Empresarial v2 (2026-08-09) — reconstrução completa a pedido do Carlos.
// Espelha supabase/migrations/0017_epico3_central_de_decisao_v2.sql. Deixou de ser singleton —
// N cenários por empresa, cada um com `nome` (Comparador de Cenários).
export const ESTRATEGIAS_AMORTIZACAO = ['nunca', 'quando_sobrar_caixa', 'todo_mes', 'a_cada_6_meses', 'manual'] as const;
export type EstrategiaAmortizacao = (typeof ESTRATEGIAS_AMORTIZACAO)[number];

export const LABEL_ESTRATEGIA_AMORTIZACAO: Record<EstrategiaAmortizacao, string> = {
  nunca: 'Nunca amortizar',
  quando_sobrar_caixa: 'Amortizar quando sobrar caixa',
  todo_mes: 'Amortizar todo mês',
  a_cada_6_meses: 'Amortizar a cada 6 meses',
  manual: 'Amortização manual',
};

// Auditoria "Simulador Financeiro — Visão Executiva" (2026-08-13) — o sistema só tinha
// entrada/financiado, sem jeito explícito de saber se o dono quis dizer "à vista" (preço cheio
// digitado em Entrada, Financiado zerado) ou "financiado" de verdade. Numericamente os dois casos
// já funcionavam sem essa coluna (preço = entrada + financiado sempre; capital próprio = entrada
// sempre), mas a INTERFACE precisa saber qual bloco de campos mostrar, sem reprocessar isso toda
// vez que o cenário é reaberto. Ver migration 0038 pra regra de compatibilidade com cenários
// salvos antes desta coluna existir.
export const FORMAS_AQUISICAO = ['avista', 'financiado'] as const;
export type FormaAquisicao = (typeof FORMAS_AQUISICAO)[number];
export const LABEL_FORMA_AQUISICAO: Record<FormaAquisicao, string> = {
  avista: 'À vista',
  financiado: 'Financiado',
};

export type CenarioSimulacao = {
  id: string;
  empresa_id: string;
  nome: string;

  capital_disponivel: number;
  veiculos_iniciais: number;

  forma_aquisicao: FormaAquisicao;
  valor_entrada_por_veiculo: number;
  valor_financiado_por_veiculo: number;
  taxa_juros_am_pct: number;
  prazo_financiamento_meses: number;

  aluguel_esperado_semanal_por_veiculo: number;
  ocupacao_esperada_pct: number;
  inadimplencia_esperada_pct: number;

  seguro_mensal_por_veiculo: number;
  ipva_anual_por_veiculo: number;
  rastreador_mensal_por_veiculo: number;
  lavagem_mensal_por_veiculo: number;
  manutencao_mensal_por_veiculo: number;
  depreciacao_am_pct: number;
  licenciamento_anual_por_veiculo: number;

  reinvestir_lucro: boolean;
  objetivo_veiculos: number;
  prazo_desejado_meses: number;

  /** Existe desde já no schema; o motor só passa a agir sobre isto na Fase 3 (Card 4). */
  amortizacao_estrategia: EstrategiaAmortizacao;
  amortizacao_valor_manual: number | null;

  /** Piso de caixa que o motor NUNCA usa pra comprar veículo nem pra amortização extraordinária
   * (2026-08-10, pedido do Carlos: "caixa de emergência"). 0 = sem reserva, comportamento antigo. */
  reserva_de_seguranca: number;

  /** Taxa anual de rendimento do caixa parado ("dinheiro aplicado") — o motor converte pra
   * mensal composta e credita todo mês sobre o saldo em caixa do início do mês. 0 = sem
   * rendimento, comportamento antigo (2026-08-10). */
  taxa_juros_investimento_aa_pct: number;
  /** Custo único, descontado do capital antes de qualquer compra de veículo (mês 0). */
  custo_abertura_empresa: number;
  /** Custo mensal fixo, não multiplicado pela frota (é da empresa, não por veículo). */
  contador_mensal: number;
  /** Alíquota de IR aplicada sobre o lucro do mês (receita + juros de investimento − despesas,
   * incluindo o contador) — só incide se esse lucro for positivo. "Lucro líquido" no resto do
   * módulo passa a significar depois desse imposto. */
  taxa_ir_pct: number;

  criado_em: string;
  atualizado_em: string;
};

export type CenarioSimulacaoInput = Omit<CenarioSimulacao, 'id' | 'empresa_id' | 'criado_em' | 'atualizado_em'>;
