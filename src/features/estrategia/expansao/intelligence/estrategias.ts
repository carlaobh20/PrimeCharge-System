import type { EstrategiaExpansao } from '../types';

// Épico 9 — Motor de Expansão, Fase 1.1 (correção pedida pelo Carlos 2026-08-11: "não invente
// números arbitrários e apresente como regra financeira universal" + "os parâmetros devem
// aparecer claramente na interface"). As 3 estratégias continuam sendo multiplicadores
// determinísticos sobre a MESMA premissa base do cenário (Regra dos 3 — 3 estratégias fixas e
// nomeadas não justificam uma tabela configurável nova) — a mudança desta revisão é que os 3
// números de cada estratégia agora são EXIBIDOS na tela (ver ExpansaoDaFrota.tsx, card
// "Parâmetros da estratégia"), não só documentados em comentário. O usuário vê exatamente por
// que "Conservadora" dá 1 carro e "Agressiva" dá 2, em vez de confiar numa conta escondida.
//
// Direção de cada estratégia (pedida explicitamente pelo Carlos):
// Conservadora = maior reserva, menor uso do capital, menor alavancagem.
// Balanceada   = reserva e uso do capital intermediários.
// Agressiva    = maior uso do capital, menor reserva, maior velocidade de expansão.
// Os valores exatos (50/75/100% e 1,5×/1×/0,5×) continuam sendo uma escolha de engenharia desta
// sessão, não uma norma de mercado — por isso ficam visíveis e editáveis-por-leitura na tela, não
// escondidos.
export type ParametrosEstrategia = {
  /** Fração do capital_disponivel do cenário que esta estratégia tenta comprometer com aquisição de veículos (0–1). */
  fracaoCapitalUsavel: number;
  /** Multiplicador sobre reserva_minima do cenário — >1 exige reserva extra (mais conservador), <1 relaxa a reserva (mais agressivo). */
  multiplicadorReserva: number;
};

export const ESTRATEGIAS: Record<EstrategiaExpansao, ParametrosEstrategia> = {
  conservadora: { fracaoCapitalUsavel: 0.5, multiplicadorReserva: 1.5 },
  balanceada: { fracaoCapitalUsavel: 0.75, multiplicadorReserva: 1.0 },
  agressiva: { fracaoCapitalUsavel: 1.0, multiplicadorReserva: 0.5 },
};

// Importante (correção da seção 7/8 do Carlos): capital reciclável (venda de veículo já
// sinalizada) NUNCA entra automaticamente no capitalParaAquisicao de nenhuma estratégia — mesmo
// a Agressiva. É mostrado como informação separada ("Capital reciclável potencial") em toda
// estratégia; se o usuário quiser contar com ele, ele mesmo soma ao editar capital_disponivel.
// Equity/capital reciclável só viram caixa quando o veículo é de fato vendido — tratá-los como
// caixa automaticamente seria exatamente o erro que o Carlos apontou.
