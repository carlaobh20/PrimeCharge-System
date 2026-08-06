import { diasAte } from '@/shared/lib/format';
import type { Arquivo } from '@/shared/capabilities/types';
import type { AcaoCandidata } from '../../types';

const JANELA_DIAS = 30;

// Gerador novo da Missão 4 (Fase 3) — mesma janela de CNH/contrato (30 dias). Só existe
// candidata pra arquivo com `data_validade` preenchida — a maioria não tem (DEC-060 nunca
// teve UI que capturasse isso até a Missão 4, ver ArquivosPanel). Cobre qualquer categoria de
// documento de veículo (CRLV, seguro, licenciamento) — a distinção de qual documento é fica
// no `nome_arquivo`, não num campo estruturado (não existe "tipo de documento" no schema,
// Regra dos 3 — não construir isso antes de um segundo caso de uso real pedir).
export function gerarAcoesDocumentoVeiculoVencendo(arquivos: Arquivo[]): AcaoCandidata[] {
  return arquivos
    .filter((a) => a.entidade_tipo === 'veiculo' && a.categoria === 'documento' && a.data_validade)
    .map((a) => ({ arquivo: a, dias: diasAte(a.data_validade) }))
    .filter((x): x is { arquivo: Arquivo; dias: number } => x.dias !== null && x.dias <= JANELA_DIAS)
    .map(({ arquivo, dias }) => ({
      titulo:
        dias < 0
          ? `Documento "${arquivo.nome_arquivo}" venceu há ${Math.abs(dias)} dia(s)`
          : `Documento "${arquivo.nome_arquivo}" vence em ${dias} dia(s)`,
      descricao: 'Renovar o documento do veículo antes do vencimento (CRLV, seguro, licenciamento).',
      tipo: 'documento_veiculo_vencendo',
      prioridade: dias < 0 ? 'critica' : dias <= 7 ? 'alta' : 'media',
      prazo: arquivo.data_validade,
      entidade_tipo: 'veiculo',
      entidade_id: arquivo.entidade_id,
      gerado_por: 'veiculo.documento_vencendo',
    }));
}
