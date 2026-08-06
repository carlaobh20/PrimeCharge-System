import { useState } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { toast } from '@/shared/components/ui/toast';
import { formatDataSimples } from '@/shared/lib/format';
import { USER_ROLE_LABEL } from '@/shared/types/database';
import { useUsuarios } from '../hooks/useUsuarios';
import { useConvitesPendentes, useDeleteConvite } from '../hooks/useConvites';
import { ConvidarUsuarioDialog } from '../components/ConvidarUsuarioDialog';

// Fase 2 da missão "MVP Operacional" (2026-08-06) — até esta sprint, não existia NENHUM
// caminho pela aplicação para uma segunda pessoa ganhar acesso a uma empresa real (`usuarios`
// nunca teve policy de INSERT, `convites` nunca teve consumidor de código). Página simples de
// propósito: quem já tem acesso, quem foi convidado e ainda não aceitou, e convidar alguém
// novo — sem fluxo de "editar cargo de colega" ainda (mesmo gap já registrado em DEC-065,
// fora do escopo desta página).
export function UsuariosPage() {
  const { data: usuarios, isLoading: loadingUsuarios } = useUsuarios();
  const { data: convites, isLoading: loadingConvites } = useConvitesPendentes();
  const deleteConvite = useDeleteConvite();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [convitePararevogar, setConvitePararevogar] = useState<string | null>(null);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Usuários</h1>
          <p className="mt-1 text-sm text-neutral-500">Quem tem acesso à sua empresa, e quem ainda falta convidar.</p>
        </div>
        <Button onClick={() => setDialogAberto(true)}>
          <UserPlus className="h-4 w-4" />
          Convidar pessoa
        </Button>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Com acesso</h2>
        {loadingUsuarios && <div className="mt-3 h-24 cockpit-shimmer rounded-2xl" />}
        {!loadingUsuarios && (
          <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {usuarios?.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{u.nome_completo ?? '—'}</td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{u.email}</td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{USER_ROLE_LABEL[u.role]}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.ativo ? 'success' : 'secondary'}>{u.ativo ? 'Ativo' : 'Desativado'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Convites pendentes</h2>
        {loadingConvites && <div className="mt-3 h-24 cockpit-shimmer rounded-2xl" />}
        {!loadingConvites && (convites?.length ?? 0) === 0 && (
          <EmptyState
            icon={Users}
            title="Nenhum convite pendente"
            description="Convide alguém da sua equipe para ganhar acesso ao sistema."
            className="mt-3"
          />
        )}
        {!loadingConvites && (convites?.length ?? 0) > 0 && (
          <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Expira em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {convites!.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{c.email}</td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{USER_ROLE_LABEL[c.role]}</td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatDataSimples(c.expira_em)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setConvitePararevogar(c.id)}
                        aria-label={`Revogar convite de ${c.email}`}
                        className="text-neutral-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConvidarUsuarioDialog open={dialogAberto} onOpenChange={setDialogAberto} />
      <ConfirmDialog
        open={!!convitePararevogar}
        onOpenChange={(open) => !open && setConvitePararevogar(null)}
        title="Revogar este convite?"
        description="O link deixa de funcionar imediatamente."
        confirmLabel="Revogar"
        destructive
        isPending={deleteConvite.isPending}
        onConfirm={() => {
          if (!convitePararevogar) return;
          deleteConvite.mutate(convitePararevogar, {
            onSuccess: () => {
              toast.success('Convite revogado');
              setConvitePararevogar(null);
            },
          });
        }}
      />
    </div>
  );
}
