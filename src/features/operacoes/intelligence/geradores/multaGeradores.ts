import { diasAte } from '@/shared/lib/format';
import type { AcaoCandidata, MultaComRelacoes } from '../../types';

const JANELA_DIAS = 15;

// Gerador novo do Épico 1 (Operação Perfeita) — fecha o achado da auditoria "MULTAS" não
// tinha fila nenhuma: a multa existia no Cockpit do Veículo (MultasPanel) e na aba Eventos
// do Motorista, mas nunca aparecia como algo a fazer. `listMultasPorEmpresa`/
// `useMultasPorEmpresa` já existiam prontos pra isso (comentário em api/multas.ts já
// antecipava esse uso) — só faltava o gerador, mesmo padrão de manutencaoGeradores.ts.
// `entidade_tipo` sempre 'veiculo' (multa.motorista_id pode ser null — nem toda multa tem
// condutor identificado — mas veiculo_id é obrigatório), consistente com MultasPanel só
// existir hoje no Cockpit do Veículo.
export function gerarAcoesMultaVencendo(multas: MultaComRelacoes[]): AcaoCandidata[] {
  return multas
    .filter((m) => m.status === 'pendente' && m.data_vencimento)
    .map((m) => ({ multa: m, dias: diasAte(m.data_vencimento) }))
    .filter((x): x is { multa: MultaComRelacoes; dias: number } => x.dias !== null && x.dias <= JANELA_DIAS)
    .map(({ multa, dias }) => {
      const placa = multa.veiculo?.placa ? ` (${multa.veiculo.placa})` : '';
      return {
        titulo:
          dias < 0
            ? `Multa "${multa.descricao}"${placa} venceu há ${Math.abs(dias)} dia(s)`
            : `Multa "${multa.descricao}"${placa} vence em ${dias} dia(s)`,
        descricao: 'Pagar ou recorrer antes do vencimento — atraso gera juros e pode gerar pontuação extra na CNH do condutor.',
        tipo: 'multa_vencendo',
        prioridade: dias < 0 ? 'critica' : dias <= 5 ? 'alta' : 'media',
        prazo: multa.data_vencimento,
        entidade_tipo: 'veiculo',
        entidade_id: multa.veiculo_id,
        gerado_por: 'multa.vencendo',
      } satisfies AcaoCandidata;
    });
}
