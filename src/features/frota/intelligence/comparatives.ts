import type { Veiculo } from '../types';
import type { ComparativoResult } from './types';

export type ComparativosInput = {
  veiculo: Pick<Veiculo, 'id' | 'quilometragem' | 'valor_mercado'>;
  diasNaFrota: number | null;
  /** Frota inteira da empresa (inclui o próprio veículo) — média exclui ele mesmo. */
  frota: Array<Pick<Veiculo, 'id' | 'quilometragem' | 'valor_mercado' | 'data_compra' | 'criado_em'>>;
  frotaComDiasNaFrota: Array<{ id: string; dias: number | null }>;
};

function media(valores: number[]) {
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

// Comparativos — v1 limitada de propósito a campos já disponíveis na consulta de listagem
// (quilometragem, valor de mercado, dias na frota), sem calcular Health Score de toda a
// frota (custaria uma consulta por veículo — não vale o custo ainda, ver DEC-022).
export function gerarComparativos(input: ComparativosInput): ComparativoResult {
  const { veiculo, diasNaFrota, frota, frotaComDiasNaFrota } = input;
  const resto = frota.filter((v) => v.id !== veiculo.id);
  const restoDias = frotaComDiasNaFrota.filter((v) => v.id !== veiculo.id).map((v) => v.dias).filter((d): d is number => d !== null);

  const itens: ComparativoResult['itens'] = [];

  const mediaKm = media(resto.map((v) => v.quilometragem));
  if (mediaKm !== null) {
    itens.push({ label: 'Km rodados', valorAtual: veiculo.quilometragem, mediaGrupo: Math.round(mediaKm), unidade: 'km', maiorEhMelhor: false });
  }

  if (diasNaFrota !== null) {
    const mediaDiasVal = media(restoDias);
    if (mediaDiasVal !== null) {
      itens.push({ label: 'Dias em operação', valorAtual: diasNaFrota, mediaGrupo: Math.round(mediaDiasVal), unidade: 'dias' });
    }
  }

  const comValorMercado = resto.filter((v) => v.valor_mercado !== null).map((v) => v.valor_mercado as number);
  const mediaValor = media(comValorMercado);
  if (veiculo.valor_mercado !== null && mediaValor !== null) {
    itens.push({ label: 'Valor de mercado', valorAtual: veiculo.valor_mercado, mediaGrupo: Math.round(mediaValor), unidade: 'R$', maiorEhMelhor: true });
  }

  return { amostraGrupo: resto.length, itens };
}
