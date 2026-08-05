import { ArquivosPanel } from '@/shared/capabilities/components/ArquivosPanel';

export function ArquivosTab({
  veiculoId,
  empresaId,
  usuarioId,
}: {
  veiculoId: string;
  empresaId?: string;
  usuarioId?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Fotos</h3>
        <ArquivosPanel
          entidadeTipo="veiculo"
          entidadeId={veiculoId}
          categoria="foto"
          bucket="veiculos-fotos"
          accept="image/*"
          label="foto"
          empresaId={empresaId}
          usuarioId={usuarioId}
        />
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Documentos</h3>
        <ArquivosPanel
          entidadeTipo="veiculo"
          entidadeId={veiculoId}
          categoria="documento"
          bucket="veiculos-documentos"
          label="documento"
          empresaId={empresaId}
          usuarioId={usuarioId}
        />
      </div>
    </div>
  );
}
