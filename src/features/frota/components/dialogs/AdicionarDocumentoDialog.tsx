import { Dialog } from '@/shared/components/ui/dialog';
import { ArquivosPanel } from '@/shared/capabilities/components/ArquivosPanel';

export function AdicionarDocumentoDialog({
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
    <Dialog open={open} onOpenChange={onOpenChange} title="Adicionar documento" description="CRLV, seguro, laudo, nota fiscal…">
      <ArquivosPanel
        entidadeTipo="veiculo"
        entidadeId={veiculoId}
        categoria="documento"
        bucket="veiculos-documentos"
        label="documento"
        empresaId={empresaId}
        usuarioId={usuarioId}
      />
    </Dialog>
  );
}
