import { Navigate, Outlet } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';

// Épico 11 — App do Motorista. Espelha RequireStaff.tsx na direção oposta: um usuário de staff
// (ou sem `usuarios` — linha órfã, ver comentário em fn_aceitar_convite) que tentar abrir
// /motorista volta pro painel administrativo. `motorista_id` nulo com role='motorista' seria
// um estado de dado inconsistente (não devia acontecer — fn_aceitar_convite sempre preenche os
// dois juntos) — mostra um erro explícito em vez de deixar a tela quebrar tentando carregar um
// contrato sem motorista_id (mesmo princípio de "não esconder estado, mostrar" do RequireOwner).
export function RequireMotorista() {
  const { data: usuario, isLoading, isError } = useCurrentUsuario();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Carregando…</div>;
  }

  if (isError || usuario?.role !== 'motorista') {
    return <Navigate to="/" replace />;
  }

  if (!usuario.motorista_id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Conta sem motorista vinculado</p>
        <p className="max-w-sm text-xs text-neutral-500">
          Sua conta existe mas não está ligada a um cadastro de motorista. Fale com a locadora para corrigir isso.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
