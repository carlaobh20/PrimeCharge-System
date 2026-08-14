import { Navigate, Outlet } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { TelaAcessoNegado } from './TelaAcessoNegado';

// Épico 11 — App do Motorista. RLS no banco é a barreira REAL de dados; este guard cuida da
// experiência (cada role no portal certo) e de não renderizar área administrativa pra quem
// não é staff confirmado.
//
// Fase 1 (2026-08-14, fix R5 da auditoria): este guard falhava ABERTO — em erro de query
// (`isError`) ele renderizava o <Outlet/> administrativo mesmo sem saber quem era o usuário.
// Agora é fail-closed, espelhando o RequireMotorista: loading → loading; erro OU perfil
// inexistente (linha órfã em usuarios) OU conta desativada → acesso negado; motorista →
// /motorista; staff ativo confirmado → libera. Nunca: erro → permitir.
export function RequireStaff() {
  const { data: usuario, isLoading, isError } = useCurrentUsuario();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Carregando…</div>;
  }

  if (isError || !usuario) {
    return <TelaAcessoNegado mensagem="Não foi possível confirmar o seu perfil de acesso. Verifique sua conexão e tente de novo — ou fale com a locadora se o problema continuar." />;
  }

  if (!usuario.ativo) {
    return <TelaAcessoNegado mensagem="Sua conta está desativada. Fale com a locadora para reativar o acesso." />;
  }

  if (usuario.role === 'motorista') {
    return <Navigate to="/motorista" replace />;
  }

  return <Outlet />;
}
