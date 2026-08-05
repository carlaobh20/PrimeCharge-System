import { Dialog } from '@/shared/components/ui/dialog';
import { ArquivosPanel } from '@/shared/capabilities/components/ArquivosPanel';

export function AdicionarDocumentoDialog({
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
    <Dialog open={open} onOpenChange={onOpenChange} title="Adicionar documento" description="CNH, comprovante de endereço, contrato assinado…">
      <ArquivosPanel
        entidadeTipo="motorista"
        entidadeId={motoristaId}
        categoria="documento"
        bucket="motoristas-documentos"
        label="documento"
        empresaId={empresaId}
        usuarioId={usuarioId}
      />
    </Dialog>
  );
}
