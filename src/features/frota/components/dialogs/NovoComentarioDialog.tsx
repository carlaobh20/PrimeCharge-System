import { Dialog } from '@/shared/components/ui/dialog';
import { ComentariosPanel } from '@/shared/capabilities/components/ComentariosPanel';

export function NovoComentarioDialog({
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
    <Dialog open={open} onOpenChange={onOpenChange} title="Comentários" className="max-w-lg">
      <ComentariosPanel entidadeTipo="veiculo" entidadeId={veiculoId} empresaId={empresaId} usuarioId={usuarioId} />
    </Dialog>
  );
}
