import { useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { USER_ROLE_LABEL, type UserRole } from '@/shared/types/database';
import { useCreateConvite } from '../hooks/useConvites';

// Cargos convidáveis por um admin comum: nunca `super_admin` (reservado à operação da
// PrimeCharge, fora do controle de uma empresa cliente) nem `motorista` (não tem portal
// próprio ainda — ARQUITETURA.md, Fase 8; convite de acesso ao sistema não se aplica).
const CARGOS_CONVIDAVEIS: UserRole[] = ['owner', 'admin', 'gestor_frota', 'gestor_financeiro', 'operador'];

export function ConvidarUsuarioDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: usuario } = useCurrentUsuario();
  const createConvite = useCreateConvite();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('operador');
  const [linkGerado, setLinkGerado] = useState<string | null>(null);

  function handleClose() {
    setEmail('');
    setRole('operador');
    setLinkGerado(null);
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!usuario?.empresa_id || !email.trim()) return;
    createConvite.mutate(
      { empresaId: usuario.empresa_id, payload: { email: email.trim(), role } },
      {
        onSuccess: (convite) => {
          toast.success('Convite criado', 'Copie o link e envie para a pessoa convidada.');
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
      title="Convidar pessoa"
      description="Ainda não há envio automático de e-mail — copie o link e envie você mesmo (WhatsApp, e-mail, etc.)."
    >
      {!linkGerado ? (
        <div className="space-y-4">
          <div>
            <Label>E-mail *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" />
          </div>
          <div>
            <Label>Cargo</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {CARGOS_CONVIDAVEIS.map((cargo) => (
                <option key={cargo} value={cargo}>
                  {USER_ROLE_LABEL[cargo]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={createConvite.isPending || !email.trim()}>
              {createConvite.isPending ? 'Gerando…' : 'Gerar convite'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Convite criado para <strong>{email}</strong> como <strong>{USER_ROLE_LABEL[role]}</strong>. O link expira em 7 dias.
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
