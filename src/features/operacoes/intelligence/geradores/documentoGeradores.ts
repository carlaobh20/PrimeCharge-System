import { ordenarPorVencimento } from '@/shared/intelligence/vencimentos';
import type { Arquivo } from '@/shared/capabilities/types';
import type { AcaoCandidata } from '../../types';

const JANELA_DIAS = 30;

// Gerador novo da Missão 4 (Fase 3) — mesma janela de CNH/contrato (30 dias). Só existe
// candidata pra arquivo com `data_validade` preenchida — a maioria não tem (DEC-060 nunca
// teve UI que capturasse isso até a Missão 4, ver ArquivosPanel). Cobre qualquer categoria de
// documento de veículo (CRLV, seguro, licenciamento) — a distinção de qual documento é fica
// no `nome_arquivo`, não num campo estruturado (não existe "tipo de documento" no schema,
// Regra dos 3 — não construir isso antes de um segundo caso de uso real pedir).
//
// Achado da auditoria da Fase 9: este gerador reimplementava manualmente o mesmo cálculo
// dias-até + filtro + ordenação que `shared/intelligence/vencimentos.ts` (DEC-060) já resolve
// de forma agnóstica de entidade — e `ordenarPorVencimento` estava órfã (nenhum consumidor a
// chamava) desde que foi criada. Corrigido para compor sobre o agregador existente em vez de
// duplicar a lógica — o gerador continua sendo o único lugar que sabe o vocabulário de negócio
// (título, prioridade, tipo, gerado_por).
export function gerarAcoesDocumentoVeiculoVencendo(arquivos: Arquivo[]): AcaoCandidata[] {
  const fontes = arquivos
    .filter((a) => a.entidade_tipo === 'veiculo' && a.categoria === 'documento' && a.data_validade)
    .map((a) => ({ label: a.nome_arquivo, data: a.data_validade, entidadeTipo: a.entidade_tipo, entidadeId: a.entidade_id }));

  return ordenarPorVencimento(fontes)
    .filter((item) => item.dias <= JANELA_DIAS)
    .map(({ label, data, dias, entidadeId }) => ({
      titulo: dias < 0 ? `Documento "${label}" venceu há ${Math.abs(dias)} dia(s)` : `Documento "${label}" vence em ${dias} dia(s)`,
      descricao: 'Renovar o documento do veículo antes do vencimento (CRLV, seguro, licenciamento).',
      tipo: 'documento_veiculo_vencendo',
      prioridade: dias < 0 ? 'critica' : dias <= 7 ? 'alta' : 'media',
      prazo: data,
      entidade_tipo: 'veiculo',
      entidade_id: entidadeId,
      gerado_por: 'veiculo.documento_vencendo',
    }));
}
