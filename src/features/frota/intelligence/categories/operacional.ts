import type { Veiculo } from '../../types';
import type { CategoriaHealthResult } from '../types';

const ESTADOS_NAO_OPERACIONAIS = new Set(['novo', 'comprado', 'preparacao']);

/**
 * Saúde Operacional — regra real, hoje baseada em: status atual e tempo desde o último
 * evento registrado (timeline_eventos, criado por todo INSERT/UPDATE relevante).
 * Sem dado de quilometragem histórica ainda — não dá pra avaliar "uso" ao longo do tempo,
 * só o estado atual.
 */
export function calcularSaudeOperacional(input: {
  veiculo: Pick<Veiculo, 'status'>;
  diasDesdeUltimoEvento: number | null;
}): CategoriaHealthResult {
  const { veiculo, diasDesdeUltimoEvento } = input;
  const motivos: string[] = [];
  let score = 100;

  if (ESTADOS_NAO_OPERACIONAIS.has(veiculo.status)) {
    motivos.push('Veículo ainda não está operacional (status pré-frota) — sem penalidade.');
  } else if (veiculo.status === 'manutencao') {
    score -= 40;
    motivos.push('Em manutenção.');
  } else if (veiculo.status === 'devolvido') {
    score -= 15;
    motivos.push('Devolvido, aguardando novo destino (locação ou manutenção).');
  }

  if (diasDesdeUltimoEvento !== null && diasDesdeUltimoEvento > 60 && !ESTADOS_NAO_OPERACIONAIS.has(veiculo.status)) {
    score -= 20;
    motivos.push(`Sem nenhuma atividade registrada há ${diasDesdeUltimoEvento} dias.`);
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 80 ? 'ok' : score >= 50 ? 'atencao' : 'critico';

  if (motivos.length === 0) motivos.push('Sem sinais de problema operacional.');

  return { categoria: 'operacional', label: 'Saúde Operacional', score, status, motivos };
}
