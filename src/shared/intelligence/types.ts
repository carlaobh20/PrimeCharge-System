// Contratos de exibição da camada de inteligência (ver DEC-022/DEC-023 no DECISION_LOG.md).
// Genéricos de propósito: qualquer feature (Veículos, e futuramente Motoristas, Contratos,
// Compras, Financeiro, Empresas) que calcular sua própria versão de Health Score, Insight,
// Alerta, Próxima Ação ou Comparativo produz um objeto neste formato — e assim pode reusar
// os Cards prontos em shared/components/intelligence/ sem duplicar UI.
//
// O que NÃO mora aqui: o cálculo em si. As regras de negócio que produzem esses objetos
// são específicas de cada domínio (a saúde operacional de um veículo não se parece em nada
// com a de um motorista ou de um contrato) e continuam vivendo na pasta intelligence/ de
// cada feature — ver `src/features/frota/intelligence/` como referência.

export type HealthCategoriaId = 'operacional' | 'documental' | 'patrimonial' | 'financeira' | 'comercial';

export type HealthStatus = 'ok' | 'atencao' | 'critico' | 'sem_dado';

export type CategoriaHealthResult = {
  categoria: HealthCategoriaId;
  label: string;
  /** null = categoria ainda não tem regra com dado real por trás — nunca é preenchido com valor arbitrário. */
  score: number | null;
  status: HealthStatus;
  motivos: string[];
};

export type HealthScoreResult = {
  /** null quando nenhuma categoria tem dado real — nunca calculado sobre categorias "sem_dado". */
  overall: number | null;
  categoriasAvaliadas: number;
  categoriasTotais: number;
  categorias: CategoriaHealthResult[];
};

export type InsightSeveridade = 'info' | 'positivo' | 'atencao';

export type Insight = {
  id: string;
  texto: string;
  severidade: InsightSeveridade;
  /** Mesma categoria do Health Score — permite que um agregador (ex.: Command Center) filtre/agrupe sem regra própria. */
  categoria: HealthCategoriaId;
};

export type AlertaSeveridade = 'atencao' | 'critico';

export type Alerta = {
  id: string;
  texto: string;
  severidade: AlertaSeveridade;
  categoria: HealthCategoriaId;
};

export type NextAction = {
  id: string;
  texto: string;
  /** Chave de ação livre — cada feature define seu próprio vocabulário (ex.: ActionKey em features/frota/lib/actions.ts). */
  actionKey: string;
  categoria: HealthCategoriaId;
};

// A partir daqui: contrato de priorização (ver DEC-024). Nasceu no Command Center, mas
// mora aqui — qualquer feature que futuramente alimentar o Command Center (Motoristas,
// Contratos...) produz PriorityMeta no mesmo formato, sem depender de código do
// Command Center (que é só mais um consumidor, igual aos Cards de Insight/Alerta/Ação).

export type Impacto = 'baixo' | 'medio' | 'alto';
export type Urgencia = 'baixa' | 'media' | 'alta';
export type Prioridade = 'baixa' | 'media' | 'alta' | 'critica';

export type PriorityMeta = {
  impacto: Impacto;
  urgencia: Urgencia;
  prioridade: Prioridade;
  /** Tipo da entidade de origem (ex.: 'veiculo') — string livre, cresce por feature, igual a NextAction.actionKey. */
  origem: string;
  origemId: string;
  /** Rótulo pronto pra exibição/link (ex.: placa do veículo). */
  origemLabel: string;
};

// Oportunidade e Risco nasceram no Command Center (Sprint 5, DEC-024) como conceitos só
// dele. Na Sprint 6 (DEC-025), Motoristas precisou dos dois — mesmo gatilho de revisita já
// registrado na DEC-024: "quando uma segunda feature precisar, os tipos sobem pra shared/".
// O formato base (sem PriorityMeta) é o que cada feature produz na sua própria
// intelligence/; o Command Center intersecciona com PriorityMeta pra priorizar entre
// origens diferentes (ver features/command-center/types.ts).
export type Opportunity = {
  id: string;
  texto: string;
  categoria: HealthCategoriaId;
  valorEstimado?: number;
};

export type Risk = {
  id: string;
  texto: string;
  categoria: HealthCategoriaId;
};

export type ComparativoItem = {
  label: string;
  valorAtual: number;
  mediaGrupo: number;
  unidade: string;
  /** true = valor maior é melhor, false = valor menor é melhor, indefinido = neutro. */
  maiorEhMelhor?: boolean;
};

export type ComparativoResult = {
  /** Tamanho do grupo usado para calcular a média (ex.: resto da frota, excluindo o próprio item). */
  amostraGrupo: number;
  itens: ComparativoItem[];
};
