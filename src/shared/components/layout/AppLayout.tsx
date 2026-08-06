import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Car, ClipboardList, FileSignature, Landmark, PieChart, Radar, LogOut, Receipt, Users, UserCog, Wallet } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { supabase } from '@/shared/lib/supabase';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';

// Central de Comando é a Home desde a Sprint 5 (DEC-024) — Dashboard virou uma rota
// analítica separada, não mais o índice. "Contratos" entra na Sprint 7, entre Motoristas e
// Dashboard — segue a ordem do funil (Veículo → Motorista → Contrato) em vez de ordem
// alfabética. Financeiro (Sprint 8) entra em 3 itens planos, não 1 só — não existe um
// "Cockpit Financeiro" único a linkar (DEC-052), então a navegação reflete isso com
// honestidade em vez de forçar uma rota-índice artificial. Ações Operacionais (Sprint 9)
// segue o mesmo raciocínio (DEC-054/055) — é fila de trabalho, não Cockpit.
const NAV_ITEMS = [
  { to: '/', label: 'Central de Comando', icon: Radar, end: true },
  { to: '/veiculos', label: 'Veículos', icon: Car, end: false },
  { to: '/motoristas', label: 'Motoristas', icon: Users, end: false },
  { to: '/contratos', label: 'Contratos', icon: FileSignature, end: false },
  { to: '/operacoes/acoes', label: 'Ações Operacionais', icon: ClipboardList, end: false },
  { to: '/financeiro/lancamentos', label: 'Lançamentos', icon: Wallet, end: false },
  { to: '/financeiro/pagamentos', label: 'Pagamentos', icon: Receipt, end: false },
  { to: '/financeiro/contas-bancarias', label: 'Contas Bancárias', icon: Landmark, end: false },
  { to: '/financeiro/centros-custo', label: 'Centros de Custo', icon: PieChart, end: false },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/usuarios', label: 'Usuários', icon: UserCog, end: true },
];

// Layout base autenticado: sidebar simples com os módulos existentes.
// Cresce conforme cada novo módulo de negócio (Comercial, Financeiro...) for construído.
export function AppLayout() {
  const { data: usuario } = useCurrentUsuario();

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <aside className="flex w-60 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="px-4 py-5">
          <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">PrimeCharge</span>
        </div>

        <nav className="flex-1 space-y-1 px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <p className="truncate text-xs text-neutral-500">{usuario?.nome_completo || usuario?.email}</p>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="mt-2 flex items-center gap-2 text-xs text-neutral-500 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
