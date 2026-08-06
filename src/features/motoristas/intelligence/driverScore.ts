import type { HealthScoreResult } from '@/shared/intelligence/types';
import type { Motorista } from '../types';

// Driver Score — Missão 3 (Driver Ecosystem), 2026-08-06. Implementa exatamente o vocabulário
// já registrado em PRIME_DRIVER_PROGRAM.md, seção 3 (sinais) e seção 2 (por que não é o
// Health Score) — este arquivo não inventa regra nova, só implementa a que já estava escrita.
// Honestidade de dado sem exceção (mesmo princípio de DEC-022): sinal sem dado real vira
// `null`, nunca um valor neutro para "não deixar vazio".

export type DriverScoreSinalId =
  | 'tempo_relacionamento'
  | 'documentacao'
  | 'operacional'
  | 'contratos_cumpridos'
  | 'pontualidade_pagamento'
  | 'indicacoes'
  | 'avaliacao_humana';

export type DriverScoreSinal = {
  id: DriverScoreSinalId;
  label: string;
  score: number | null;
  motivo: string;
};

export type DriverScoreResult = {
  overall: number | null;
  sinaisAvaliados: number;
  sinaisTotais: number;
  sinais: DriverScoreSinal[];
};

export type DriverScoreInput = {
  motorista: Pick<Motorista, 'criado_em'>;
  healthScore: HealthScoreResult;
  /** Dias desde a transição de status mais recente — usado como proxy de "tempo contínuo
   * como ativo" (PRIME_DRIVER_PROGRAM.md seção 4). Ver DEC desta missão sobre a limitação
   * desta aproximação (timeline_eventos não tem coluna estruturada de "para qual status"). */
  diasNoStatusAtual: number | null;
  contratos: { total: number; encerradosNormalmente: number; cancelados: number };
  pagamentos: { total: number; pagos: number; pagosNoPrazo: number };
};

function media(valores: number[]): number {
  return Math.round(valores.reduce((soma, v) => soma + v, 0) / valores.length);
}

export function calcularDriverScore(input: DriverScoreInput): DriverScoreResult {
  const diasComoCliente = Math.floor((Date.now() - new Date(input.motorista.criado_em).getTime()) / 86_400_000);
  // Tempo de relacionamento: normalizado numa escala simples (24 meses = score máximo),
  // mesmo racional de "ponto de partida documentado, não calibração final" da seção 1 do
  // documento de fundação — recalibrar quando houver massa real de motoristas de longa data.
  const scoreTempoRelacionamento = Math.min(100, Math.round((diasComoCliente / 730) * 100));

  const categoriaDocumental = input.healthScore.categorias.find((c) => c.categoria === 'documental');
  const categoriaOperacional = input.healthScore.categorias.find((c) => c.categoria === 'operacional');

  const scoreContratos =
    input.contratos.total === 0
      ? null
      : Math.round((input.contratos.encerradosNormalmente / (input.contratos.encerradosNormalmente + input.contratos.cancelados || 1)) * 100);

  const scorePontualidade = input.pagamentos.pagos === 0 ? null : Math.round((input.pagamentos.pagosNoPrazo / input.pagamentos.pagos) * 100);

  const sinais: DriverScoreSinal[] = [
    {
      id: 'tempo_relacionamento',
      label: 'Tempo de relacionamento',
      score: scoreTempoRelacionamento,
      motivo: `${diasComoCliente} dia(s) como motorista cadastrado.`,
    },
    {
      id: 'documentacao',
      label: 'Documentação em dia',
      score: categoriaDocumental?.score ?? null,
      motivo: categoriaDocumental?.score !== null ? 'Reaproveita Health Score, categoria documental.' : 'Sem dado documental ainda.',
    },
    {
      id: 'operacional',
      label: 'Comportamento operacional',
      score: categoriaOperacional?.score ?? null,
      motivo: categoriaOperacional?.score !== null ? 'Reaproveita Health Score, categoria operacional.' : 'Sem dado operacional ainda.',
    },
    {
      id: 'contratos_cumpridos',
      label: 'Contratos cumpridos sem cancelamento',
      score: scoreContratos,
      motivo:
        scoreContratos !== null
          ? `${input.contratos.encerradosNormalmente} encerrado(s) normalmente, ${input.contratos.cancelados} cancelado(s), de ${input.contratos.total} no total.`
          : 'Nenhum contrato no histórico ainda.',
    },
    {
      id: 'pontualidade_pagamento',
      label: 'Pontualidade de pagamento',
      score: scorePontualidade,
      motivo:
        scorePontualidade !== null
          ? `${input.pagamentos.pagosNoPrazo} de ${input.pagamentos.pagos} pagamento(s) pago(s) dentro do prazo.`
          : 'Nenhum pagamento pago ainda — sinal liberado pela Missão 2 (Pagamentos), sem histórico suficiente ainda.',
    },
    {
      id: 'indicacoes',
      label: 'Indicações trazidas',
      score: null,
      motivo: 'Não implementado — sem estrutura de indicação ainda (PRIME_DRIVER_PROGRAM.md, seção 3).',
    },
    {
      id: 'avaliacao_humana',
      label: 'Avaliação humana da locadora',
      score: null,
      motivo: 'Não implementado — sem campo de avaliação ainda (PRIME_DRIVER_PROGRAM.md, seção 3).',
    },
  ];

  const avaliados = sinais.filter((s) => s.score !== null);
  const overall = avaliados.length === 0 ? null : media(avaliados.map((s) => s.score as number));

  return { overall, sinaisAvaliados: avaliados.length, sinaisTotais: sinais.length, sinais };
}

// Níveis do Prime Driver — PRIME_DRIVER_PROGRAM.md seção 4. Limiares (180/365/730 dias =
// 6/12/24 meses) são os mesmos "ponto de partida documentado, não calibração final" que o
// próprio documento já avisa precisar de recalibração com dado real.
export type NivelPrimeDriver = 'bronze' | 'prata' | 'ouro' | 'black';

export const NIVEL_PRIME_DRIVER_LABEL: Record<NivelPrimeDriver, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  black: 'Black',
};

export type NivelPrimeDriverInput = {
  motoristaAtivo: boolean;
  documentacaoEmDia: boolean;
  diasContinuosAtivo: number | null;
  semAlertaCriticoOperacionalOuDocumental: boolean;
  /** Proxy honesto, não uma leitura direta de "violação": nenhum contrato cancelado no
   * histórico. Um contrato cancelado por mútuo acordo (não violação) também zera este sinal
   * hoje — limitação registrada em DEC, não resolvida nesta missão por falta de um campo
   * "motivo de cancelamento" em `contratos`. */
  semContratoCancelado: boolean;
  semPagamentoEmAtraso: boolean;
};

export function calcularNivelPrimeDriver(input: NivelPrimeDriverInput): NivelPrimeDriver {
  if (!input.motoristaAtivo || !input.documentacaoEmDia) return 'bronze';

  const dias = input.diasContinuosAtivo ?? 0;

  const qualificaPrata = dias >= 180 && input.semAlertaCriticoOperacionalOuDocumental;
  if (!qualificaPrata) return 'bronze';

  const qualificaOuro = dias >= 365 && input.semContratoCancelado && input.semPagamentoEmAtraso;
  if (!qualificaOuro) return 'prata';

  const qualificaBlack = dias >= 730 && input.semContratoCancelado && input.semPagamentoEmAtraso;
  if (!qualificaBlack) return 'ouro';

  return 'black';
}
