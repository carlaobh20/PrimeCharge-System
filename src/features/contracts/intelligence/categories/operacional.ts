import type { Contrato } from '../../types';
import type { CategoriaHealthResult } from '../types';

const ESTADOS_TERMINAIS = new Set(['encerrado', 'cancelado']);
const ESTADOS_PRE_ATIVACAO = new Set(['rascunho', 'em_analise', 'aprovado', 'assinado']);

/**
 * Saúde Operacional — regra real: contrato ativo com data de fim vencida sem renovação nem
 * encerramento é o pior caso (dinheiro/ativo parado numa decisão que ninguém tomou); contrato
 * parado em fase pré-ativação por muito tempo é o segundo pior. Mesmo padrão de
 * calcularSaudeOperacional (Veículo/Motorista), adaptado à state machine do Contrato.
 */
export function calcularSaudeOperacional(input: {
  contrato: Pick<Contrato, 'status'>;
  diasAteVencimento: number | null;
  diasDesdeUltimoEvento: number | null;
}): CategoriaHealthResult {
  const { contrato, diasAteVencimento, diasDesdeUltimoEvento } = input;
  const motivos: string[] = [];
  let score = 100;

  if (ESTADOS_TERMINAIS.has(contrato.status)) {
    motivos.push('Contrato encerrado ou cancelado — sem penalidade operacional.');
  } else {
    if (contrato.status === 'ativo' && diasAteVencimento !== null && diasAteVencimento < 0) {
      score -= 50;
      motivos.push(`Contrato ativo passou ${Math.abs(diasAteVencimento)} dias da data de fim prevista sem renovação ou encerramento.`);
    }

    if (
      ESTADOS_PRE_ATIVACAO.has(contrato.status) &&
      diasDesdeUltimoEvento !== null &&
      diasDesdeUltimoEvento > 15
    ) {
      score -= 25;
      motivos.push(`Parado em "${contrato.status}" há ${diasDesdeUltimoEvento} dias sem avançar.`);
    }
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 80 ? 'ok' : score >= 50 ? 'atencao' : 'critico';

  if (motivos.length === 0) motivos.push('Sem sinais de problema operacional.');

  return { categoria: 'operacional', label: 'Saúde Operacional', score, status, motivos };
}
