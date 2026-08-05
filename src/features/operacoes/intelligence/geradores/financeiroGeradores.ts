import { diasAte } from '@/shared/lib/format';
import type { PagamentoComRelacoes } from '@/features/financeiro/types';
import type { AcaoCandidata } from '../../types';

// Gerador 3 de 3 (DEC-055) — pagamento em atraso (pendente + data_prevista no passado, mesmo
// critério de calcularSaudeFinanceira em shared/intelligence/saudeFinanceira.ts). Só gera
// Ação quando o lançamento tem alguma dimensão (contrato/veículo/motorista) — sem isso não há
// `entidade_tipo`/`entidade_id` pra ancorar a ação nem pra deduplicar entre sincronizações
// (o índice único depende do par não ser nulo). Um lançamento sem dimensão (ex.: despesa geral
// da empresa) continua visível na lista de Lançamentos (Sprint 8) mesmo sem virar Ação aqui.
export function gerarAcoesPagamentoAtrasado(pagamentosPendentes: PagamentoComRelacoes[]): AcaoCandidata[] {
  return pagamentosPendentes
    .map((p) => ({ pagamento: p, dias: diasAte(p.data_prevista) }))
    .filter((x): x is { pagamento: PagamentoComRelacoes; dias: number } => x.dias !== null && x.dias < 0)
    .map(({ pagamento, dias }): AcaoCandidata | null => {
      const l = pagamento.lancamento;
      const dimensao = l?.contrato_id
        ? { entidade_tipo: 'contrato', entidade_id: l.contrato_id }
        : l?.veiculo_id
          ? { entidade_tipo: 'veiculo', entidade_id: l.veiculo_id }
          : l?.motorista_id
            ? { entidade_tipo: 'motorista', entidade_id: l.motorista_id }
            : null;
      if (!dimensao) return null;

      return {
        titulo: `Pagamento "${l?.descricao ?? 'sem descrição'}" atrasado há ${Math.abs(dias)} dia(s)`,
        descricao: 'Regularizar ou renegociar o pagamento em atraso.',
        tipo: 'cobranca_atrasada',
        prioridade: Math.abs(dias) >= 15 ? 'critica' : Math.abs(dias) >= 7 ? 'alta' : 'media',
        prazo: pagamento.data_prevista,
        entidade_tipo: dimensao.entidade_tipo,
        entidade_id: dimensao.entidade_id,
        gerado_por: 'financeiro.pagamento_atrasado',
      };
    })
    .filter((c): c is AcaoCandidata => c !== null);
}
