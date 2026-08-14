// Épico 4 — "Ativo Financeiro". Vários pedaços da missão (Yield, Capital Recuperado, Resultado
// Esperado, Patrimônio da Empresa) precisam do mesmo número: "quanto vale este veículo hoje".
// Extraído aqui em vez de duplicado em cada cálculo — mesmo racional de amortizacao.ts.
//
// Prioridade da fonte (do mais atual pro mais antigo): valor de mercado (se alguém atualizou
// manualmente, é o dado mais confiável) → valor FIPE (referência de mercado, atualizada por
// terceiros) → valor de compra (só resta isso pra veículo recém-cadastrado). Nunca inventa um
// número quando os três estão vazios — retorna null e quem chama decide como mostrar isso.
export function resolverValorAtualVeiculo(veiculo: {
  valor_mercado: number | null;
  valor_fipe: number | null;
  valor_compra: number | null;
}): number | null {
  return veiculo.valor_mercado ?? veiculo.valor_fipe ?? veiculo.valor_compra ?? null;
}

// Qual das três fontes foi usada — pra UI poder rotular o número ("valor de mercado" vs.
// "FIPE" vs. "valor de compra") em vez de apresentar como se fosse sempre a mesma coisa.
export type FonteValorAtivo = 'mercado' | 'fipe' | 'compra' | null;

export function fonteValorAtualVeiculo(veiculo: {
  valor_mercado: number | null;
  valor_fipe: number | null;
  valor_compra: number | null;
}): FonteValorAtivo {
  if (veiculo.valor_mercado !== null) return 'mercado';
  if (veiculo.valor_fipe !== null) return 'fipe';
  if (veiculo.valor_compra !== null) return 'compra';
  return null;
}
