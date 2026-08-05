import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { VeiculosListPage } from '@/features/frota/pages/VeiculosListPage';
import { VeiculoDetailPage } from '@/features/frota/pages/VeiculoDetailPage';
import { VeiculoCreatePage } from '@/features/frota/pages/VeiculoCreatePage';
import { VeiculoEditPage } from '@/features/frota/pages/VeiculoEditPage';
import { ProtectedRoute } from './ProtectedRoute';

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
          { index: true, element: <DashboardPage /> },
          { path: 'veiculos', element: <VeiculosListPage /> },
          { path: 'veiculos/novo', element: <VeiculoCreatePage /> },
          { path: 'veiculos/:id', element: <VeiculoDetailPage /> },
          { path: 'veiculos/:id/editar', element: <VeiculoEditPage /> },
        ],
      },
    ],
  },
]);
