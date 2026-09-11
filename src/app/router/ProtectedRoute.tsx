import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';

const LandingPage = lazy(() => import('@/features/landing/LandingPage'));

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Carregando…</div>;
  }

  if (!session) {
    // "/" é a única rota pública quando não há sessão: mostra a landing (site
    // público, portado do site de marketing) em vez de redirecionar pro login.
    // Qualquer outra rota protegida continua mandando pro /login como sempre.
    if (location.pathname === '/') {
      return (
        <Suspense fallback={null}>
          <LandingPage />
        </Suspense>
      );
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
