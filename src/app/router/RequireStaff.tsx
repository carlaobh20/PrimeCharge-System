import { Navigate, Outlet } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';

// Épico 11 — App do Motorista. Antes desta fase, NENHUMA rota do PrimeCharge OS checava role
// no client (achado já registrado em RequireOwner.tsx) — não importava porque não existia
// ainda uma role com um destino diferente. Agora existe: um usuário role='motorista' logado em
// "/" veria o AppLayout administrativo inteiro (menu de Frota, Financeiro, Usuários...) — RLS
// no banco impediria QUALQUER leitura de dado de outra empresa/motorista, mas a experiência
// seria um painel administrativo vazio e sem sentido pra quem só devia ver o próprio contrato.
// Redireciona pro portal certo em vez disso.
export function RequireStaff() {
  const { data: usuario, isLoading, isError } = useCurrentUsuario();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Carregando…</div>;
  }

  if (!isError && usuario?.role === 'motorista') {
    return <Navigate to="/motorista" replace />;
  }

  return <Outlet />;
}
