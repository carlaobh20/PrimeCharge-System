import { Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';

// Épico 2 (Centro de Estratégia, achado de auditoria 2026-08-09): até aqui NENHUMA rota da
// aplicação checava cargo no client — só RLS no banco (achado de segurança já documentado,
// nunca corrigido). Não importava muito até agora porque nenhuma tela expunha dado sensível o
// bastante pra valer o custo de implementar o primeiro gate. Centro de Estratégia muda isso:
// mostra capital disponível, metas de lucro, planos de expansão — dado que faz sentido ficar
// restrito ao proprietário, mesmo com colegas (gestor_frota/financeiro/operador) já logados no
// sistema. Em vez de redirecionar silenciosamente (o usuário ficaria sem entender por que o
// link do menu não abre), mostra uma mensagem honesta — mesmo padrão de "não esconder estado,
// mostrar" já usado no erro do Centro de Operações (ver CentroDeOperacoesPage.tsx). Reaproveita
// `useCurrentUsuario()` (já existia, já usado no AppLayout) — nenhuma consulta nova.
export function RequireOwner() {
  const { data: usuario, isLoading, isError } = useCurrentUsuario();

  if (isLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">Carregando…</div>;
  }

  const podeAcessar = !isError && (usuario?.role === 'owner' || usuario?.role === 'super_admin');

  if (!podeAcessar) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="h-8 w-8 text-neutral-400" />
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Área restrita ao proprietário</p>
        <p className="max-w-sm text-xs text-neutral-500">
          O Centro de Estratégia mostra capital, metas e planos de crescimento da empresa — só o proprietário tem
          acesso a esta tela.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
