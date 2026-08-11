// Épico 9 — Fase 2.1, Parte 3 (2026-08-11). Promovido de features/estrategia/expansao (onde
// nasceu na Fase 1, seção 17: "usuário precisa saber se está vendo dinheiro real ou estimado")
// pra shared/ — exceção deliberada ao padrão "só generaliza no 2º consumidor" (DEC-025, ver
// kpi-card.tsx) porque o pedido explícito da Parte 3 é exatamente turnar este selo o padrão
// único de rotulagem de origem de dado em todo o PrimeCharge, não só na tela de Expansão.
//
// Objetivo (Parte 3): qualquer número na tela precisa deixar claro se é DADO REAL (lido do
// banco, ao vivo), PREMISSA (parâmetro que o usuário digitou/assumiu), ESTIMATIVA (o sistema
// preencheu com a melhor fonte disponível, mas não é o número exato) ou PROJEÇÃO (resultado de
// uma simulação, nunca aconteceu de fato ainda).
export type OrigemDado = 'real' | 'premissa' | 'estimativa' | 'projecao';

const ESTILOS: Record<OrigemDado, string> = {
  real: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  premissa: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  projecao: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  estimativa: 'bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-400',
};

const TEXTO: Record<OrigemDado, string> = {
  real: 'DADO REAL',
  premissa: 'PREMISSA',
  projecao: 'PROJEÇÃO',
  estimativa: 'ESTIMATIVA',
};

export function SeloOrigemDado({ origem }: { origem: OrigemDado }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ESTILOS[origem]}`}>{TEXTO[origem]}</span>;
}

/**
 * Parte 4 (obrigatório, "não inventar dados") — o par de um `SeloOrigemDado`: quando o valor
 * que deveria ir aqui simplesmente não existe (nenhum `valor_mercado`/`valor_fipe`/`valor_compra`
 * cadastrado, por exemplo), isso não vira um "R$ 0,00" nem um traço silencioso — vira um aviso
 * explícito, com o motivo, pra deixar claro que é uma LACUNA de cadastro, não um valor real de
 * zero.
 */
export function InformacaoIndisponivel({ motivo }: { motivo?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:border-white/20 dark:text-neutral-400">
      Informação não disponível{motivo ? ` — ${motivo}` : ''}
    </span>
  );
}
