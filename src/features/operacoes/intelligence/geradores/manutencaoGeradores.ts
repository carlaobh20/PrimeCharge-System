import { diasAte } from '@/shared/lib/format';
import type { Manutencao } from '../../types';
import type { AcaoCandidata } from '../../types';

const JANELA_DIAS = 7;

// Gerador novo da Missão 4 (Fase 3) — fecha o achado da auditoria de jornada: antes desta
// missão "manutenção pendente" não existia nem em tese (manutencoes só registrava o que já
// tinha acontecido). Só `data_agendada` — `status_execucao = 'agendada'` já garante isso
// (migration 0012). Janela menor que CNH/contrato (7 dias, não 30) porque manutenção
// agendada costuma ser marcada com pouca antecedência (oficina confirma data próxima).
export function gerarAcoesManutencaoAgendadaVencendo(manutencoes: Manutencao[]): AcaoCandidata[] {
  return manutencoes
    .filter((m) => m.status_execucao === 'agendada' && m.data_agendada)
    .map((m) => ({ manutencao: m, dias: diasAte(m.data_agendada) }))
    .filter((x): x is { manutencao: Manutencao; dias: number } => x.dias !== null && x.dias <= JANELA_DIAS)
    .map(({ manutencao, dias }) => ({
      titulo:
        dias < 0
          ? `Manutenção "${manutencao.descricao}" estava agendada há ${Math.abs(dias)} dia(s) e não foi confirmada`
          : `Manutenção "${manutencao.descricao}" agendada para daqui ${dias} dia(s)`,
      descricao: 'Confirmar a execução na oficina ou marcar como realizada quando acontecer.',
      tipo: 'manutencao_agendada',
      prioridade: dias < 0 ? 'critica' : dias <= 2 ? 'alta' : 'media',
      prazo: manutencao.data_agendada,
      entidade_tipo: 'veiculo',
      entidade_id: manutencao.veiculo_id,
      gerado_por: 'manutencao.agendada_vencendo',
    }));
}
