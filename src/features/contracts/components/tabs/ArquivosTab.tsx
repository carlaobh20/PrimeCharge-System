import { ArquivosPanel } from '@/shared/capabilities/components/ArquivosPanel';

export function ArquivosTab({
  contratoId,
  empresaId,
  usuarioId,
}: {
  contratoId: string;
  empresaId?: string;
  usuarioId?: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Documentos</h3>
      <ArquivosPanel
        entidadeTipo="contrato"
        entidadeId={contratoId}
        categoria="documento"
        bucket="contratos-arquivos"
        label="documento"
        empresaId={empresaId}
        usuarioId={usuarioId}
      />
    </div>
  );
}
