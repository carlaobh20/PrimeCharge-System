import { Dialog } from '@/shared/components/ui/dialog';
import { TagsPanel } from '@/shared/capabilities/components/TagsPanel';

export function NovaTagDialog({
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
    <Dialog open={open} onOpenChange={onOpenChange} title="Tags">
      <TagsPanel entidadeTipo="contrato" entidadeId={contratoId} empresaId={empresaId} usuarioId={usuarioId} />
    </Dialog>
  );
}
