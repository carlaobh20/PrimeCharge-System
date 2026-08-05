import type { ComparativoResult } from './types';

export type ComparativosInput = {
  contratoId: string;
  valorPeriodico: number;
  /** Demais contratos ativos da empresa com a mesma periodicidade — mesmo padrão de
   * grupoComDiasComoCliente (Motorista): grupo pré-carregado por quem chama, não buscado aqui. */
  grupoComValor: Array<{ id: string; valor: number }>;
};

function media(valores: number[]) {
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

// Comparativos — v1 limitada de propósito ao único campo já disponível para todo contrato sem
// depender de módulos futuros: valor periódico contratado. Cresce quando Financeiro existir
// (pontualidade, inadimplência...), sem mudar a assinatura desta função — mesmo padrão de
// gerarComparativos (Motorista).
export function gerarComparativos(input: ComparativosInput): ComparativoResult {
  const { contratoId, valorPeriodico, grupoComValor } = input;
  const resto = grupoComValor.filter((c) => c.id !== contratoId).map((c) => c.valor);

  const itens: ComparativoResult['itens'] = [];
  const mediaValor = media(resto);
  if (mediaValor !== null) {
    itens.push({
      label: 'Tarifa contratada',
      valorAtual: valorPeriodico,
      mediaGrupo: Math.round(mediaValor * 100) / 100,
      unidade: 'R$',
    });
  }

  return { amostraGrupo: resto.length, itens };
}
