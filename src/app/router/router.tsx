import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/app/layout/AppLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AceitarConvitePage } from '@/features/auth/pages/AceitarConvitePage';
import { UsuariosPage } from '@/features/auth/pages/UsuariosPage';
import { CentroDeOperacoesPage } from '@/features/command-center/pages/CentroDeOperacoesPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { FrotaPage } from '@/features/frota/pages/FrotaPage';
import { VeiculoDetailPage } from '@/features/frota/pages/VeiculoDetailPage';
import { VeiculoCreatePage } from '@/features/frota/pages/VeiculoCreatePage';
import { VeiculoEditPage } from '@/features/frota/pages/VeiculoEditPage';
import { MotoristasPage } from '@/features/motoristas/pages/MotoristasPage';
import { MotoristaDetailPage } from '@/features/motoristas/pages/MotoristaDetailPage';
import { MotoristaCreatePage } from '@/features/motoristas/pages/MotoristaCreatePage';
import { MotoristaEditPage } from '@/features/motoristas/pages/MotoristaEditPage';
import { ContratosListPage } from '@/features/contracts/pages/ContratosListPage';
import { ContratoDetailPage } from '@/features/contracts/pages/ContratoDetailPage';
import { ContratoCreatePage } from '@/features/contracts/pages/ContratoCreatePage';
import { ContratoEditPage } from '@/features/contracts/pages/ContratoEditPage';
import { LancamentosListPage } from '@/features/financeiro/pages/LancamentosListPage';
import { PagamentosPage } from '@/features/financeiro/pages/PagamentosPage';
import { ContasBancariasPage } from '@/features/financeiro/pages/ContasBancariasPage';
import { CentrosCustoPage } from '@/features/financeiro/pages/CentrosCustoPage';
import { AcoesListPage } from '@/features/operacoes/pages/AcoesListPage';
import { CentroDeEstrategiaPage } from '@/features/estrategia/pages/CentroDeEstrategiaPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RequireOwner } from './RequireOwner';

// Command Center foi a Home da Sprint 5 até o Épico 1 (Operação Perfeita) — Dashboard
// continua fora do índice, rota analítica separada (DEC-024, ainda válida). Centro de
// Operações ABSORVE a Central de Comando (mesmo useCommandCenter por baixo, ver
// CentroDeOperacoesPage.tsx) em vez de virar rota nova ao lado — só troca o que é a Home.
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/aceitar-convite',
    element: <AceitarConvitePage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <CentroDeOperacoesPage /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'veiculos', element: <FrotaPage /> },
          { path: 'veiculos/novo', element: <VeiculoCreatePage /> },
          { path: 'veiculos/:id', element: <VeiculoDetailPage /> },
          { path: 'veiculos/:id/editar', element: <VeiculoEditPage /> },
          { path: 'motoristas', element: <MotoristasPage /> },
          { path: 'motoristas/novo', element: <MotoristaCreatePage /> },
          { path: 'motoristas/:id', element: <MotoristaDetailPage /> },
          { path: 'motoristas/:id/editar', element: <MotoristaEditPage /> },
          { path: 'contratos', element: <ContratosListPage /> },
          { path: 'contratos/novo', element: <ContratoCreatePage /> },
          { path: 'contratos/:id', element: <ContratoDetailPage /> },
          { path: 'contratos/:id/editar', element: <ContratoEditPage /> },
          { path: 'financeiro/lancamentos', element: <LancamentosListPage /> },
          { path: 'financeiro/pagamentos', element: <PagamentosPage /> },
          { path: 'financeiro/contas-bancarias', element: <ContasBancariasPage /> },
          { path: 'financeiro/centros-custo', element: <CentrosCustoPage /> },
          { path: 'operacoes/acoes', element: <AcoesListPage /> },
          {
            path: 'estrategia',
            element: <RequireOwner />,
            children: [{ index: true, element: <CentroDeEstrategiaPage /> }],
          },
          { path: 'usuarios', element: <UsuariosPage /> },
        ],
      },
    ],
  },
]);
