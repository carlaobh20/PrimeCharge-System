import type { Veiculo } from '../types';
import type { Alerta } from './types';

export type AlertsInput = {
  veiculo: Pick<Veiculo, 'status' | 'valor_mercado' | 'valor_fipe'>;
  totalDocumentos: number;
  diasDesdeUltimoEvento: number | null;
};

// Alertas — coisas que pedem atenção agora, sempre derivadas de regra real sobre dado real.
export function gerarAlertas(input: AlertsInput): Alerta[] {
  const { veiculo, totalDocumentos, diasDesdeUltimoEvento } = input;
  const alertas: Alerta[] = [];

  if (totalDocumentos === 0) {
    alertas.push({ id: 'sem-documento', texto: 'Nenhum documento cadastrado para este veículo.', severidade: 'atencao' });
  }

  if (veiculo.status === 'manutencao') {
    alertas.push({ id: 'em-manutencao', texto: 'Veículo está em manutenção.', severidade: 'atencao' });
  }

  if (
    diasDesdeUltimoEvento !== null &&
    diasDesdeUltimoEvento > 90 &&
    !['novo', 'comprado', 'preparacao'].includes(veiculo.status)
  ) {
    alertas.push({
      id: 'inatividade',
      texto: `Sem nenhuma atividade registrada há mais de ${diasDesdeUltimoEvento} dias.`,
      severidade: 'critico',
    });
  }

  if (veiculo.valor_mercado === null && veiculo.valor_fipe === null) {
    alertas.push({ id: 'sem-valores', texto: 'Nenhum valor de mercado ou FIPE cadastrado.', severidade: 'atencao' });
  }

  return alertas;
}
