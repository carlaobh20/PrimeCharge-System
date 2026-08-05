import { Dialog } from '@/shared/components/ui/dialog';
import { ComentariosPanel } from '@/shared/capabilities/components/ComentariosPanel';

export function NovoComentarioDialog({
  open,
  onOpenChange,
  contratoId,
  empresaId,
  usuarioId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoId: string;
  empresaId?: string;
  usuarioId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Comentários" className="max-w-lg">
      <ComentariosPanel entidadeTipo="contrato" entidadeId={contratoId} empresaId={empresaId} usuarioId={usuarioId} />
    </Dialog>
  );
}
