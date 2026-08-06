import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { extrairMensagemDeErro, toast } from '@/shared/components/ui/toast';

// MutationCache global — um único ponto de wiring cobre TODA mutation do sistema, atual e
// futura, sem precisar editar cada `useMutation` individualmente (achado da auditoria de CTO
// de 2026-08-06: nenhuma mutation tinha `onError`, e adicionar isso caso a caso em ~20+
// hooks seria exatamente a duplicação que FOUNDATION_PRINCIPLES.md pede para evitar). Uma
// mutation que já define seu próprio `onError` local continua funcionando normalmente — os
// dois não se substituem, o TanStack Query chama o global depois do local.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error('Não foi possível concluir a ação', extrairMensagemDeErro(error));
    },
  }),
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
