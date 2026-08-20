// Parte PURA da minuta master (sem import Vite ?raw) — separada pra ser testável em Node
// (scripts/audit-juridico-fase2.ts lê o .md do disco e chama estas funções; o app importa
// minutaMaster.ts, que injeta o texto via ?raw). Uma lógica só, dois pontos de entrada.
import { extrairVariaveis } from './lib';

export const AVISO_MINUTA = 'MINUTA SUJEITA À REVISÃO JURÍDICA';
export const NOME_TEMPLATE_MASTER = 'Contrato Master — Locação de Veículo (minuta)';

const INICIO_CORPO = '## CONTRATO DE LOCAÇÃO';
const FIM_CORPO = '## Notas para o advogado';

/**
 * Extrai da minuta só o CORPO contratual (do "## CONTRATO DE LOCAÇÃO..." até antes das "Notas
 * para o advogado"). Cabeçalho de status, tabela de variáveis e notas ficam FORA do documento.
 * Falha explícita se os marcadores sumirem — melhor quebrar do que gerar contrato vazio.
 */
export function extrairCorpoDaMinuta(md: string): string {
  const inicio = md.indexOf(INICIO_CORPO);
  if (inicio < 0) throw new Error(`Minuta master sem o marcador de início "${INICIO_CORPO}"`);
  let fim = md.indexOf(FIM_CORPO, inicio);
  if (fim < 0) fim = md.length;
  const corpo = md
    .slice(inicio, fim)
    .replace(/\n---+\s*$/m, '\n')
    .trimEnd();
  return corpo + '\n';
}

/** Variáveis {{...}} usadas pelo corpo — vira `contrato_templates.variaveis`. */
export function variaveisDoCorpo(corpo: string): string[] {
  return extrairVariaveis(corpo);
}
