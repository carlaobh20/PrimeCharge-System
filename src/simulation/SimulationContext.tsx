// Missão 7 — Modo Simulação: ponte React para o estado global (simulationState.ts).
//
// Não guarda estado próprio — só espelha o singleton via useSyncExternalStore, pra qualquer
// componente (botão no topo, badge, etc.) re-renderizar quando a simulação liga/desliga.
// A ativação em si é assíncrona (precisa ler o usuário real ANTES de desviar `supabase.from`
// pro fake client — ver comentário em supabase.ts) por isso `activate`/`toggle` retornam
// Promise.

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { isSimulationActive, setSimulationActive, subscribeSimulation } from './simulationState';
import { simulationStore } from './store';
import { buildSimulationDataset, type SimulationCurrentUser } from './seedData';

type SimulationContextValue = {
  isActive: boolean;
  isActivating: boolean;
  toggle: () => Promise<void>;
  reiniciar: () => void;
};

const SimulationContext = createContext<SimulationContextValue | null>(null);

async function resolveCurrentUser(): Promise<SimulationCurrentUser | null> {
  // Chamado ANTES de ligar a simulação — nesta janela `supabase.from`/`supabase.auth` ainda
  // apontam 100% pro Supabase real, então isto é uma leitura real (só leitura, nunca grava).
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;
  const { data: usuarioReal } = await supabase
    .from('usuarios')
    .select('nome_completo, email')
    .eq('id', authData.user.id)
    .maybeSingle();
  return {
    id: authData.user.id,
    nome: (usuarioReal?.nome_completo as string | undefined) ?? null,
    email: (usuarioReal?.email as string | undefined) ?? authData.user.email ?? null,
  };
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const isActive = useSyncExternalStore(subscribeSimulation, isSimulationActive, () => false);
  const [isActivating, setIsActivating] = useState(false);
  const queryClient = useQueryClient();

  const toggle = useCallback(async () => {
    if (isSimulationActive()) {
      setSimulationActive(false);
      // Sem isto, o React Query continuaria mostrando o dado simulado em cache até a
      // próxima invalidação natural (staleTime de 30s, ver QueryProvider) — o pedido é
      // "desligou, volta IMEDIATAMENTE pro dado real".
      await queryClient.invalidateQueries();
      return;
    }
    setIsActivating(true);
    try {
      const currentUser = await resolveCurrentUser();
      simulationStore.ensureSeeded(() => buildSimulationDataset(currentUser));
      setSimulationActive(true);
      await queryClient.invalidateQueries();
    } finally {
      setIsActivating(false);
    }
  }, [queryClient]);

  const reiniciar = useCallback(() => {
    // Só faz sentido com a simulação ligada — gera um dataset novo do zero (mesmo usuário
    // atual, se disponível a partir do último dataset já carregado não é reconsultado; troca
    // de usuário real durante a simulação é um caso de borda raro o bastante pra não valer a
    // complexidade extra de resolver de novo aqui).
    simulationStore.reset(() => buildSimulationDataset(null));
    void queryClient.invalidateQueries();
  }, [queryClient]);

  const value = useMemo<SimulationContextValue>(
    () => ({ isActive, isActivating, toggle, reiniciar }),
    [isActive, isActivating, toggle, reiniciar]
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation deve ser usado dentro de <SimulationProvider>');
  return ctx;
}
