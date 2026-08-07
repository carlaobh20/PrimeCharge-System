// Missão 7 — Modo Simulação.
//
// Estado global de "a simulação está ativa?", fora da árvore React de propósito: o ponto de
// interceptação real (supabase.ts, ver comentário lá) roda dentro de funções `api/*.ts` que
// não são componentes e não podem chamar useContext. Um módulo singleton com
// subscribe/notify (o mesmo padrão que useSyncExternalStore espera) é o jeito mais simples
// de ter UM estado, lido tanto por código React (via useSimulation()) quanto por código
// puro (o proxy do client supabase).
//
// Por que localStorage e não sessionStorage/memória pura: a âncora do pedido é "quando eu
// ativar, quero que pareça uma empresa operando há anos" — isso só é crível se recarregar a
// página (F5, navegar direto por URL, etc.) não apagar a simulação no meio do uso. Ativação é
// uma decisão explícita e visível (botão no topo + badge em toda tela), nunca implícita.

const STORAGE_KEY = 'primecharge:simulacao:ativa';

type Listener = () => void;

const listeners = new Set<Listener>();

function readPersisted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // localStorage indisponível (modo privado restrito, SSR, etc.) — simulação sempre começa
    // desligada nesse caso; nunca deixamos o app quebrar por causa disso.
    return false;
  }
}

let active = readPersisted();

export function isSimulationActive(): boolean {
  return active;
}

export function setSimulationActive(value: boolean): void {
  if (active === value) return;
  active = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Ver readPersisted — não é crítico, só significa que o toggle não sobrevive a um reload.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeSimulation(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
