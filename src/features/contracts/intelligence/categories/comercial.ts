import type { Contrato } from '../../types';
import type { CategoriaHealthResult } from '../types';

const ESTADOS_TERMINAIS = new Set(['encerrado', 'cancelado']);

/**
 * Saúde Comercial — regra real (primeiro caso do módulo Contratos com dado próprio, sem
 * depender de Financeiro): proximidade da data de fim prevista sem renovação registrada.
 * Diferente do Veículo/Motorista, aqui "comercial" tem dado real desde já porque é
 * literalmente o que o Contrato administra — não é evidência emprestada de outro módulo.
 */
export function calcularSaudeComercial(input: {
  contrato: Pick<Contrato, 'status'>;
  diasAteVencimento: number | null;
}): CategoriaHealthResult {
  const { contrato, diasAteVencimento } = input;

  if (ESTADOS_TERMINAIS.has(contrato.status)) {
    return {
      categoria: 'comercial',
      label: 'Saúde Comercial',
      score: null,
      status: 'sem_dado',
      motivos: ['Contrato encerrado ou cancelado — não avaliado comercialmente.'],
    };
  }

  if (contrato.status !== 'ativo' || diasAteVencimento === null) {
    return {
      categoria: 'comercial',
      label: 'Saúde Comercial',
      score: null,
      status: 'sem_dado',
      motivos: ['Sem data de fim prevista cadastrada, ou contrato ainda não está ativo.'],
    };
  }

  const motivos: string[] = [];
  let score = 100;

  if (diasAteVencimento < 0) {
    score -= 60;
    motivos.push(`Passou ${Math.abs(diasAteVencimento)} dias da data de fim prevista sem renovação.`);
  } else if (diasAteVencimento <= 15) {
    score -= 25;
    motivos.push(`Vence em ${diasAteVencimento} dias sem renovação registrada ainda.`);
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 80 ? 'ok' : score >= 50 ? 'atencao' : 'critico';

  if (motivos.length === 0) motivos.push(`Contrato ativo, vence em ${diasAteVencimento} dias — sem sinal de risco comercial.`);

  return { categoria: 'comercial', label: 'Saúde Comercial', score, status, motivos };
}
