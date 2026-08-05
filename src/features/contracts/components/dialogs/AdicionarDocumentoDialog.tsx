import { Dialog } from '@/shared/components/ui/dialog';
import { ArquivosPanel } from '@/shared/capabilities/components/ArquivosPanel';

export function AdicionarDocumentoDialog({
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
    <Dialog open={open} onOpenChange={onOpenChange} title="Adicionar documento" description="Contrato assinado, vistoria, comprovante…">
      <ArquivosPanel
        entidadeTipo="contrato"
        entidadeId={contratoId}
        categoria="documento"
        bucket="contratos-arquivos"
        label="documento"
        empresaId={empresaId}
        usuarioId={usuarioId}
      />
    </Dialog>
  );
}
