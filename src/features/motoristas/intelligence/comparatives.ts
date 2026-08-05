import type { ComparativoResult } from './types';

export type ComparativosInput = {
  motoristaId: string;
  diasComoCliente: number | null;
  /** Demais motoristas da empresa (para calcular a média) — mesmo padrão de frotaComDiasNaFrota (Veículo). */
  grupoComDiasComoCliente: Array<{ id: string; dias: number | null }>;
};

function media(valores: number[]) {
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

// Comparativos — v1 limitada de propósito ao único campo já disponível para todo motorista
// sem depender de módulos futuros: dias como cliente. Cresce quando Contratos/Financeiro
// existirem (receita gerada, pontualidade…), sem mudar a assinatura desta função.
export function gerarComparativos(input: ComparativosInput): ComparativoResult {
  const { motoristaId, diasComoCliente, grupoComDiasComoCliente } = input;
  const resto = grupoComDiasComoCliente.filter((m) => m.id !== motoristaId).map((m) => m.dias).filter((d): d is number => d !== null);

  const itens: ComparativoResult['itens'] = [];

  if (diasComoCliente !== null) {
    const mediaDias = media(resto);
    if (mediaDias !== null) {
      itens.push({ label: 'Dias como cliente', valorAtual: diasComoCliente, mediaGrupo: Math.round(mediaDias), unidade: 'dias' });
    }
  }

  return { amostraGrupo: resto.length, itens };
}
