import { ordenarPorVencimento } from '@/shared/intelligence/vencimentos';
import type { Arquivo } from '@/shared/capabilities/types';
import type { AcaoCandidata } from '../../types';

const JANELA_DIAS = 30;

// Gerador da Missão 4 (Fase 3), generalizado na Missão 5 (Fase 4 — Documentos, DEC-112): até
// aqui só cobria `entidade_tipo === 'veiculo'`, apesar de `arquivos.data_validade` (DEC-060) e
// `listArquivosComValidadePorEntidadeTipo` já serem 100% agnósticos de entidade — a
// restrição a Veículo era só de quem chamava (`AcoesListPage`), não do gerador nem do
// agregador. Motorista e Contrato também têm a mesma capability de `arquivos` (CNH digitalizada,
// contrato assinado, laudo de vistoria) e o mesmo campo `data_validade` disponível desde
// sempre — generalizar aqui é aplicar o motor já existente a mais entidades, não criar
// abstração nova (Regra dos 3 não se aplica: não é uma 4ª forma de calcular vencimento, é a
// mesma função `ordenarPorVencimento` de sempre, sem filtro de `entidade_tipo`).
//
// Continua sem `tipo_documento` estruturado (a distinção de qual documento é fica no
// `nome_arquivo`) — decisão prévia explícita, reafirmada em DEC-112, não revisitada aqui.
export function gerarAcoesDocumentoVencendo(arquivos: Arquivo[]): AcaoCandidata[] {
  const fontes = arquivos
    .filter((a) => a.categoria === 'documento' && a.data_validade)
    .map((a) => ({ label: a.nome_arquivo, data: a.data_validade, entidadeTipo: a.entidade_tipo, entidadeId: a.entidade_id }));

  return ordenarPorVencimento(fontes)
    .filter((item) => item.dias <= JANELA_DIAS)
    .map(({ label, data, dias, entidadeTipo, entidadeId }) => ({
      titulo: dias < 0 ? `Documento "${label}" venceu há ${Math.abs(dias)} dia(s)` : `Documento "${label}" vence em ${dias} dia(s)`,
      descricao: 'Renovar o documento antes do vencimento (CRLV, seguro, licenciamento, CNH digitalizada, contrato assinado etc.).',
      tipo: 'documento_vencendo',
      prioridade: dias < 0 ? 'critica' : dias <= 7 ? 'alta' : 'media',
      prazo: data,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      gerado_por: `${entidadeTipo}.documento_vencendo`,
    }));
}
