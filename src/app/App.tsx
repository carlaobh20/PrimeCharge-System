import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { Toaster } from '@/shared/components/ui/toast';
import { router } from '@/app/router/router';

export function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          {/* Boundary externo pras páginas públicas lazy (login/convite/senha), que ficam fora
              dos layouts — os layouts têm o próprio Suspense por dentro. */}
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Carregando…</div>}>
            <RouterProvider router={router} />
          </Suspense>
          <Toaster />
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
