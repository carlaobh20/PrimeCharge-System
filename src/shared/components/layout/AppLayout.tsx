import { Outlet } from 'react-router-dom';

// Layout base autenticado: sidebar + topbar entram aqui na Fase 1,
// quando os módulos de negócio (Frota, Comercial...) existirem para popular o menu.
export function AppLayout() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Outlet />
    </div>
  );
}
