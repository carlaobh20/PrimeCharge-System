import type { Veiculo } from '../../types';
import type { CategoriaHealthResult } from '../types';

/**
 * Saúde Patrimonial — regra real: completude dos valores cadastrados (compra/FIPE/mercado)
 * + uma checagem de sanidade (valor de mercado muito acima do valor de compra é incomum
 * para um ativo que deprecia, então vira um aviso, não um erro).
 */
export function calcularSaudePatrimonial(input: {
  veiculo: Pick<Veiculo, 'valor_compra' | 'valor_fipe' | 'valor_mercado'>;
}): CategoriaHealthResult {
  const { veiculo } = input;
  const motivos: string[] = [];
  let score = 100;

  const campos: [string, number | null][] = [
    ['valor de compra', veiculo.valor_compra],
    ['valor FIPE', veiculo.valor_fipe],
    ['valor de mercado', veiculo.valor_mercado],
  ];
  const faltando = campos.filter(([, v]) => v === null);
  if (faltando.length > 0) {
    score -= faltando.length * 20;
    motivos.push(`Faltando: ${faltando.map(([nome]) => nome).join(', ')}.`);
  }

  if (veiculo.valor_compra !== null && veiculo.valor_mercado !== null) {
    const razao = veiculo.valor_mercado / veiculo.valor_compra;
    if (razao > 1.05) {
      score -= 10;
      motivos.push('Valor de mercado acima do valor de compra — vale confirmar se está correto.');
    }
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 80 ? 'ok' : score >= 50 ? 'atencao' : 'critico';
  if (motivos.length === 0) motivos.push('Todos os valores patrimoniais estão cadastrados.');

  return { categoria: 'patrimonial', label: 'Saúde Patrimonial', score, status, motivos };
}
