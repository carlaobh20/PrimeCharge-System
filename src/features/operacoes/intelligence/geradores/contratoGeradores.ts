import { diasAte } from '@/shared/lib/format';
import type { ContratoComRelacoes } from '@/features/contracts/types';
import type { AcaoCandidata } from '../../types';

const JANELA_DIAS = 30;

// Gerador 2 de 3 (DEC-055) — contrato vencendo. Só contrato `ativo` com `data_fim_prevista`
// preenchida e dentro da janela (renovação real usa ContratoStatus.renovacao — DEC-034 — a
// Ação aqui é o lembrete pra alguém decidir, não a transição em si).
export function gerarAcoesContratoVencendo(contratos: ContratoComRelacoes[]): AcaoCandidata[] {
  return contratos
    .filter((c) => c.status === 'ativo' && c.data_fim_prevista)
    .map((c) => ({ contrato: c, dias: diasAte(c.data_fim_prevista) }))
    .filter((x): x is { contrato: ContratoComRelacoes; dias: number } => x.dias !== null && x.dias <= JANELA_DIAS)
    .map(({ contrato, dias }) => ({
      titulo:
        dias < 0
          ? `Contrato de ${contrato.motorista.nome_completo} (${contrato.veiculo.placa}) venceu há ${Math.abs(dias)} dia(s)`
          : `Contrato de ${contrato.motorista.nome_completo} (${contrato.veiculo.placa}) vence em ${dias} dia(s)`,
      descricao: 'Decidir renovação, devolução ou encerramento do contrato antes do vencimento.',
      tipo: 'renovacao_contrato',
      prioridade: dias < 0 ? 'critica' : dias <= 7 ? 'alta' : 'media',
      prazo: contrato.data_fim_prevista,
      entidade_tipo: 'contrato',
      entidade_id: contrato.id,
      gerado_por: 'contrato.vencendo',
    }));
}
