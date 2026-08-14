import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';

// Épico 11 — App do Motorista, Fase 1. Shell mobile-first — SEM a sidebar/topbar densa do
// AppLayout.tsx admin (esse é feito pra tela de desktop, tabela de dados, muitos itens de
// menu). Aqui é o oposto: uma coluna só, largura de celular, uma barra fixa no topo. Só um
// destino na Fase 1 (Meu Contrato) — sem tab bar inferior ainda (Regra dos 3: não construir
// navegação pra 2ª/3ª tela antes delas existirem; Pagamentos/Vistoria entram como próximas
// fases e é quando a tab bar ganha sentido real).
export function AppLayoutMotorista() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-neutral-950/80">
        <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">PrimeCharge</span>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </header>
      <main className="mx-auto max-w-md px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}
