import { resolverValorAtualVeiculo } from '@/shared/lib/valorAtivo';
import type { Veiculo } from '../types';
import type { ResumoFinanciamentoReal } from './financiamentoReal';

export type ResultadoEsperadoAtivo = {
  valorAtual: number | null;
  saldoDevedor: number;
  patrimonioLiquido: number | null;
  lucroRealizado: number;
  lucroProjetadoAteVenda: number | null;
  valorEsperadoVenda: number | null;
  resultadoTotalEsperado: number | null;
  // Épico 5 — "Consolidação", item 7 (Patrimônio do Ativo). Deliberadamente ENTRA neste
  // mesmo resultado em vez de virar um card novo: valor de compra/FIPE/mercado e a
  // depreciação já são só uma decomposição de `valorAtual`/`patrimonioLiquido` acima (mesmo
  // cálculo, resolverValorAtualVeiculo), e um segundo card financeiro do veículo do lado
  // deste correria o risco real de duplicação que a auditoria pediu pra evitar.
  valorCompra: number | null;
  valorFipe: number | null;
  valorMercado: number | null;
  depreciacao: number | null;
  // "Lucro potencial de venda" pedido — ganho de capital puro (venda − compra), diferente de
  // `resultadoTotalEsperado` (que já soma lucro operacional realizado + projetado).
  ganhoDeCapitalEsperado: number | null;
};

// Épico 4 — "Ativo Financeiro", Parte 7. As primeiras 4 linhas (valor atual, saldo devedor,
// patrimônio líquido, lucro realizado) são todas dado já calculado em outro lugar (Partes 1-4),
// só compostas aqui num card único.
//
// "Lucro projetado até venda" é a única linha que é PROJEÇÃO, e projeção precisa de um
// horizonte no tempo. O cadastro não tem "data prevista de venda" — só `data_venda`, que só é
// preenchida DEPOIS que a venda já aconteceu de verdade (Missão 4). Decisão (Palpite
// documentado, não uma pergunta que trava a tela): usa a quitação prevista do financiamento
// como horizonte — é a única data futura que o sistema realmente conhece sobre este veículo.
// Sem financiamento (compra direta) não existe nenhum horizonte no cadastro — a projeção fica
// null, nunca uma data inventada.
//
// "Valor esperado da venda" usa `valor_residual_estimado` (campo que já existe, feito
// exatamente pra isso) — se não preenchido, cai pro mesmo valor atual (mercado>FIPE>compra) que
// alimenta Yield/Capital Recuperado, como melhor estimativa disponível, não um número novo.
export function calcularResultadoEsperado(
  veiculo: Pick<Veiculo, 'valor_mercado' | 'valor_fipe' | 'valor_compra' | 'valor_residual_estimado'>,
  resumoFinanciamento: ResumoFinanciamentoReal | null,
  lucroRealizado: number,
  lucroMedioMensal: number | null
): ResultadoEsperadoAtivo {
  const valorAtual = resolverValorAtualVeiculo(veiculo);
  const saldoDevedor = resumoFinanciamento?.saldoDevedorAtual ?? 0;
  const patrimonioLiquido = valorAtual !== null ? valorAtual - saldoDevedor : null;
  const valorEsperadoVenda = veiculo.valor_residual_estimado ?? valorAtual;

  let lucroProjetadoAteVenda: number | null = null;
  if (resumoFinanciamento && !resumoFinanciamento.quitado && lucroMedioMensal !== null && lucroMedioMensal > 0) {
    const mesesRestantes = Math.max(0, resumoFinanciamento.tabela.length - resumoFinanciamento.mesesDecorridos);
    lucroProjetadoAteVenda = lucroMedioMensal * mesesRestantes;
  }

  const resultadoTotalEsperado =
    valorEsperadoVenda !== null ? lucroRealizado + (lucroProjetadoAteVenda ?? 0) + (valorEsperadoVenda - saldoDevedor) : null;

  const depreciacao = veiculo.valor_compra !== null && valorAtual !== null ? veiculo.valor_compra - valorAtual : null;
  const ganhoDeCapitalEsperado =
    veiculo.valor_compra !== null && valorEsperadoVenda !== null ? valorEsperadoVenda - veiculo.valor_compra : null;

  return {
    valorAtual,
    saldoDevedor,
    patrimonioLiquido,
    lucroRealizado,
    lucroProjetadoAteVenda,
    valorEsperadoVenda,
    resultadoTotalEsperado,
    valorCompra: veiculo.valor_compra,
    valorFipe: veiculo.valor_fipe,
    valorMercado: veiculo.valor_mercado,
    depreciacao,
    ganhoDeCapitalEsperado,
  };
}
