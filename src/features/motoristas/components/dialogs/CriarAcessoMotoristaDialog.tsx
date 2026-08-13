import { useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useCreateConvite } from '@/features/auth/hooks/useConvites';
import type { Motorista } from '../../types';

// Épico 11 — App do Motorista, Fase 1. Reaproveita o MESMO mecanismo de convite/aceite do
// staff (0009_onboarding_convites.sql / AceitarConvitePage.tsx) em vez de um fluxo novo — só
// fixa role='motorista' (nunca aparece como opção, diferente de ConvidarUsuarioDialog) e leva
// junto o motoristaId, que a migration 0034 usa pra vincular a conta criada a ESTE registro.
// Mesma limitação do fluxo de staff: sem envio automático de e-mail — o link é gerado aqui e
// precisa ser enviado manualmente (WhatsApp, SMS, etc.) pro motorista.
export function CriarAcessoMotoristaDialog({
  open,
  onOpenChange,
  motorista,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: Motorista;
}) {
  const { data: usuario } = useCurrentUsuario();
  const createConvite = useCreateConvite();
  const [email, setEmail] = useState(motorista.email ?? '');
  const [linkGerado, setLinkGerado] = useState<string | null>(null);

  function handleClose() {
    setEmail(motorista.email ?? '');
    setLinkGerado(null);
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!usuario?.empresa_id || !email.trim()) return;
    createConvite.mutate(
      { empresaId: usuario.empresa_id, payload: { email: email.trim(), role: 'motorista', motoristaId: motorista.id } },
      {
        onSuccess: (convite) => {
          toast.success('Acesso criado', 'Copie o link e envie para o motorista.');
          setLinkGerado(`${window.location.origin}/aceitar-convite?token=${convite.token}`);
        },
      }
    );
  }

  async function handleCopiarLink() {
    if (!linkGerado) return;
    await navigator.clipboard.writeText(linkGerado);
    toast.success('Link copiado');
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="Criar acesso ao portal do motorista"
      description={`${motorista.nome_completo} vai poder ver o próprio contrato e veículo pelo celular. Ainda não há envio automático — copie o link e envie você mesmo.`}
    >
      {!linkGerado ? (
        <div className="space-y-4">
          <div>
            <Label>E-mail do motorista *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="motorista@email.com" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={createConvite.isPending || !email.trim()}>
              {createConvite.isPending ? 'Gerando…' : 'Gerar link de acesso'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Link de acesso criado para <strong>{email}</strong>. Expira em 7 dias — envie antes disso.
          </p>
          <div className="break-all rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400">
            {linkGerado}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Fechar
            </Button>
            <Button type="button" onClick={handleCopiarLink}>
              Copiar link
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
