import { diasAte } from '@/shared/lib/format';
import type { Motorista } from '@/features/motoristas/types';
import type { AcaoCandidata } from '../../types';

const JANELA_DIAS = 30;

// Gerador 1 de 3 desta sprint (DEC-055) — CNH vencendo. Só motorista `ativo` com
// `cnh_validade` preenchida e dentro da janela de 30 dias (inclui já vencida — diasAte
// negativo continua "<= 30").
export function gerarAcoesCnhVencendo(motoristas: Motorista[]): AcaoCandidata[] {
  return motoristas
    .filter((m) => m.status === 'ativo' && m.cnh_validade)
    .map((m) => ({ motorista: m, dias: diasAte(m.cnh_validade) }))
    .filter((x): x is { motorista: Motorista; dias: number } => x.dias !== null && x.dias <= JANELA_DIAS)
    .map(({ motorista, dias }) => ({
      titulo:
        dias < 0
          ? `CNH de ${motorista.nome_completo} venceu há ${Math.abs(dias)} dia(s)`
          : `CNH de ${motorista.nome_completo} vence em ${dias} dia(s)`,
      descricao: 'Renovar a Carteira Nacional de Habilitação antes do vencimento.',
      tipo: 'renovacao_documento',
      prioridade: dias < 0 ? 'critica' : dias <= 7 ? 'alta' : 'media',
      prazo: motorista.cnh_validade,
      entidade_tipo: 'motorista',
      entidade_id: motorista.id,
      gerado_por: 'motorista.cnh_vencendo',
    }));
}
