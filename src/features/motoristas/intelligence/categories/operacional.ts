import type { Motorista } from '../../types';
import type { CategoriaHealthResult } from '../types';

const ESTADOS_NAO_OPERACIONAIS = new Set(['lead', 'em_analise', 'encerrado']);

/**
 * Saúde Operacional — regra real, hoje baseada em: status atual e tempo desde o último
 * evento registrado (timeline_eventos). Mesmo padrão de calcularSaudeOperacional (Veículo),
 * adaptado à state machine do Motorista.
 */
export function calcularSaudeOperacional(input: {
  motorista: Pick<Motorista, 'status'>;
  diasDesdeUltimoEvento: number | null;
}): CategoriaHealthResult {
  const { motorista, diasDesdeUltimoEvento } = input;
  const motivos: string[] = [];
  let score = 100;

  if (ESTADOS_NAO_OPERACIONAIS.has(motorista.status)) {
    motivos.push('Motorista ainda não está ativo ou já foi encerrado — sem penalidade.');
  } else if (motorista.status === 'bloqueado') {
    score -= 40;
    motivos.push('Motorista bloqueado.');
  } else if (motorista.status === 'inativo') {
    score -= 15;
    motivos.push('Motorista inativo no momento.');
  }

  if (
    diasDesdeUltimoEvento !== null &&
    diasDesdeUltimoEvento > 60 &&
    !ESTADOS_NAO_OPERACIONAIS.has(motorista.status)
  ) {
    score -= 20;
    motivos.push(`Sem nenhuma atividade registrada há ${diasDesdeUltimoEvento} dias.`);
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 80 ? 'ok' : score >= 50 ? 'atencao' : 'critico';

  if (motivos.length === 0) motivos.push('Sem sinais de problema operacional.');

  return { categoria: 'operacional', label: 'Saúde Operacional', score, status, motivos };
}
