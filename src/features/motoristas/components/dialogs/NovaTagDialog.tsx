import { Dialog } from '@/shared/components/ui/dialog';
import { TagsPanel } from '@/shared/capabilities/components/TagsPanel';

export function NovaTagDialog({
  open,
  onOpenChange,
  motoristaId,
  empresaId,
  usuarioId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motoristaId: string;
  empresaId?: string;
  usuarioId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Tags">
      <TagsPanel entidadeTipo="motorista" entidadeId={motoristaId} empresaId={empresaId} usuarioId={usuarioId} />
    </Dialog>
  );
}
