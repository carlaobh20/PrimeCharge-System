import { Navigate, Outlet } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { TelaAcessoNegado } from './TelaAcessoNegado';

// Épico 11 — App do Motorista. Espelha RequireStaff.tsx na direção oposta. Já era fail-closed
// no essencial; Fase 1 (2026-08-14) alinha os detalhes: erro de query vira tela de acesso
// negado AQUI (antes redirecionava pra "/", que agora também nega — funcionava, mas dava um
// redirect a mais e uma mensagem pior), e conta desativada é negada explicitamente (a policy
// "usuarios: ve o proprio registro" não checa `ativo`, então o perfil carrega — mas
// current_empresa_id()/current_motorista_id() no banco já retornariam vazio; a UI só deixa
// isso honesto em vez de mostrar um portal sem dados).
export function RequireMotorista() {
  const { data: usuario, isLoading, isError } = useCurrentUsuario();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Carregando…</div>;
  }

  if (isError) {
    return <TelaAcessoNegado mensagem="Não foi possível confirmar o seu perfil de acesso. Verifique sua conexão e tente de novo — ou fale com a locadora se o problema continuar." />;
  }

  if (!usuario || usuario.role !== 'motorista') {
    return <Navigate to="/" replace />;
  }

  if (!usuario.ativo) {
    return <TelaAcessoNegado mensagem="Sua conta está desativada. Fale com a locadora para reativar o acesso." />;
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
