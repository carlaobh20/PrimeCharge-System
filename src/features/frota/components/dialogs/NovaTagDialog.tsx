import { Dialog } from '@/shared/components/ui/dialog';
import { TagsPanel } from '@/shared/capabilities/components/TagsPanel';

export function NovaTagDialog({
  open,
  onOpenChange,
  veiculoId,
  empresaId,
  usuarioId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoId: string;
  empresaId?: string;
  usuarioId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Tags">
      <TagsPanel entidadeTipo="veiculo" entidadeId={veiculoId} empresaId={empresaId} usuarioId={usuarioId} />
    </Dialog>
  );
}
