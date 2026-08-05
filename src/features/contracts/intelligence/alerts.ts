import type { Contrato } from '../types';
import type { Alerta } from './types';

export type AlertsInput = {
  contrato: Pick<Contrato, 'status' | 'carga_final_pct'>;
  totalDocumentos: number;
  diasAteVencimento: number | null;
  diasDesdeUltimoEvento: number | null;
};

// Alertas — coisas que pedem atenção agora, sempre derivadas de regra real sobre dado real.
// O alerta de carga de devolução é o mais diretamente ligado à Proposta de Valor registrada em
// PRODUCT_VISION.md: veículo elétrico devolvido descarregado e oferecido como disponível é a
// dor operacional nº 1 do setor (pesquisa de mercado, DEC-033) — nenhum concorrente pesquisado
// bloqueia ou alerta isso hoje.
export function gerarAlertas(input: AlertsInput): Alerta[] {
  const { contrato, totalDocumentos, diasAteVencimento, diasDesdeUltimoEvento } = input;
  const alertas: Alerta[] = [];

  if (contrato.status === 'ativo' && diasAteVencimento !== null && diasAteVencimento < 0) {
    alertas.push({
      id: 'vencido',
      texto: `Contrato ativo passou da data de fim prevista há ${Math.abs(diasAteVencimento)} dias, sem renovação nem encerramento.`,
      severidade: 'critico',
      categoria: 'comercial',
    });
  } else if (contrato.status === 'ativo' && diasAteVencimento !== null && diasAteVencimento <= 15) {
    alertas.push({
      id: 'vencendo',
      texto: `Contrato vence em ${diasAteVencimento} dias sem renovação registrada.`,
      severidade: 'atencao',
      categoria: 'comercial',
    });
  }

  if (contrato.carga_final_pct !== null && contrato.carga_final_pct < 25) {
    alertas.push({
      id: 'devolvido-descarregado',
      texto: `Veículo devolvido com ${contrato.carga_final_pct}% de carga — abaixo de 25% afeta a disponibilidade da próxima locação.`,
      severidade: 'atencao',
      categoria: 'operacional',
    });
  }

  if (totalDocumentos === 0 && contrato.status !== 'rascunho') {
    alertas.push({
      id: 'sem-documento',
      texto: 'Nenhum documento anexado a este contrato (contrato assinado, vistoria...).',
      severidade: 'atencao',
      categoria: 'documental',
    });
  }

  if (
    ['rascunho', 'em_analise', 'aprovado', 'assinado'].includes(contrato.status) &&
    diasDesdeUltimoEvento !== null &&
    diasDesdeUltimoEvento > 15
  ) {
    alertas.push({
      id: 'parado-pre-ativacao',
      texto: `Parado em "${contrato.status}" há ${diasDesdeUltimoEvento} dias sem avançar.`,
      severidade: 'critico',
      categoria: 'operacional',
    });
  }

  return alertas;
}
