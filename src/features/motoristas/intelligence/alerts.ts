import type { Motorista } from '../types';
import type { Alerta } from './types';

export type AlertsInput = {
  motorista: Pick<Motorista, 'status'>;
  totalDocumentos: number;
  diasAteVencimentoCnh: number | null;
  diasDesdeUltimoEvento: number | null;
};

// Alertas — coisas que pedem atenção agora, sempre derivadas de regra real sobre dado real.
export function gerarAlertas(input: AlertsInput): Alerta[] {
  const { motorista, totalDocumentos, diasAteVencimentoCnh, diasDesdeUltimoEvento } = input;
  const alertas: Alerta[] = [];

  if (totalDocumentos === 0) {
    alertas.push({
      id: 'sem-documento',
      texto: 'Nenhum documento cadastrado para este motorista.',
      severidade: 'atencao',
      categoria: 'documental',
    });
  }

  if (diasAteVencimentoCnh !== null && diasAteVencimentoCnh < 0) {
    alertas.push({
      id: 'cnh-vencida',
      texto: `CNH vencida há ${Math.abs(diasAteVencimentoCnh)} dias.`,
      severidade: 'critico',
      categoria: 'documental',
    });
  } else if (diasAteVencimentoCnh !== null && diasAteVencimentoCnh <= 30) {
    alertas.push({
      id: 'cnh-vencendo',
      texto: `CNH vence em ${diasAteVencimentoCnh} dias.`,
      severidade: 'atencao',
      categoria: 'documental',
    });
  }

  if (motorista.status === 'bloqueado') {
    alertas.push({
      id: 'bloqueado',
      texto: 'Motorista está bloqueado.',
      severidade: 'atencao',
      categoria: 'operacional',
    });
  }

  if (
    diasDesdeUltimoEvento !== null &&
    diasDesdeUltimoEvento > 90 &&
    !['lead', 'em_analise', 'encerrado'].includes(motorista.status)
  ) {
    alertas.push({
      id: 'inatividade',
      texto: `Sem nenhuma atividade registrada há mais de ${diasDesdeUltimoEvento} dias.`,
      severidade: 'critico',
      categoria: 'operacional',
    });
  }

  return alertas;
}
