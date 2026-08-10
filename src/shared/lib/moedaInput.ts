// Máscara de moeda estilo "maquininha" (2026-08-10, pedido do Carlos: "ajuste os números que for
// valor em x.xxx,xx" + "quando for pra números inteiros, está mudando nos decimais"). O usuário
// digita dígitos e eles entram pela direita, como centavos — modelo que qualquer app financeiro
// brasileiro usa (Nubank, maquininha de cartão). Formata SEMPRE como x.xxx,xx (separador de
// milhar + vírgula decimal), nunca mostra o "cru" (100000) que <input type=number> nativo mostra.
//
// Extraído de PainelDePremissas.tsx (estrategia/) pra reusar em AmortizacaoCard.tsx, e depois
// promovido pra shared/ (2026-08-10, Épico 4 Parte 2) quando o módulo Veículos passou a precisar
// do mesmo input de "quanto amortizar hoje" — mesmo padrão de amortizacao.ts/valorAtivo.ts:
// generalizar só quando o segundo módulo de verdade precisa, nunca antes.
export function formatarMoedaInput(valorReais: number): string {
  return valorReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function digitosParaReais(valorDigitado: string): number {
  const soDigitos = valorDigitado.replace(/\D/g, '');
  if (soDigitos === '') return 0;
  return Number(soDigitos) / 100;
}
