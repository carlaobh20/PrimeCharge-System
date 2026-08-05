import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { CommandCenterPage } from '@/features/command-center/pages/CommandCenterPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { VeiculosListPage } from '@/features/frota/pages/VeiculosListPage';
import { VeiculoDetailPage } from '@/features/frota/pages/VeiculoDetailPage';
import { VeiculoCreatePage } from '@/features/frota/pages/VeiculoCreatePage';
import { VeiculoEditPage } from '@/features/frota/pages/VeiculoEditPage';
import { MotoristasListPage } from '@/features/motoristas/pages/MotoristasListPage';
import { MotoristaDetailPage } from '@/features/motoristas/pages/MotoristaDetailPage';
import { MotoristaCreatePage } from '@/features/motoristas/pages/MotoristaCreatePage';
import { MotoristaEditPage } from '@/features/motoristas/pages/MotoristaEditPage';
import { ProtectedRoute } from './ProtectedRoute';

// Command Center é a Home desde a Sprint 5 — Dashboard sai do índice e vira uma rota
// analítica separada (ver DEC-024).
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <CommandCenterPage /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'veiculos', element: <VeiculosListPage /> },
          { path: 'veiculos/novo', element: <VeiculoCreatePage /> },
          { path: 'veiculos/:id', element: <VeiculoDetailPage /> },
          { path: 'veiculos/:id/editar', element: <VeiculoEditPage /> },
          { path: 'motoristas', element: <MotoristasListPage /> },
          { path: 'motoristas/novo', element: <MotoristaCreatePage /> },
          { path: 'motoristas/:id', element: <MotoristaDetailPage /> },
          { path: 'motoristas/:id/editar', element: <MotoristaEditPage /> },
        ],
      },
    ],
  },
]);
