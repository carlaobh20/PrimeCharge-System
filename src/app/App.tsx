import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { Toaster } from '@/shared/components/ui/toast';
import { router } from '@/app/router/router';
import { SimulationProvider } from '@/simulation/SimulationContext';

export function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        {/* Missão 7 — precisa estar dentro do QueryProvider (usa useQueryClient para
            invalidar o cache inteiro ao ligar/desligar a simulação) e fora do AuthProvider
            (o botão/badge aparecem no layout autenticado, mas o Provider em si não depende
            de sessão). */}
        <SimulationProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster />
          </AuthProvider>
        </SimulationProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
