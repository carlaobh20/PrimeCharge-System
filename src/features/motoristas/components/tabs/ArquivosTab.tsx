import { ArquivosPanel } from '@/shared/capabilities/components/ArquivosPanel';

// Diferente do Veículo (que tem fotos + documentos em buckets separados), o Motorista não tem
// bucket de foto de capa — avatar do Cockpit é por iniciais (ver MotoristaCockpitHeader). Só
// um painel de documentos aqui (CNH, comprovante de endereço, contrato assinado…).
export function ArquivosTab({
  motoristaId,
  empresaId,
  usuarioId,
}: {
  motoristaId: string;
  empresaId?: string;
  usuarioId?: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Documentos</h3>
      <ArquivosPanel
        entidadeTipo="motorista"
        entidadeId={motoristaId}
        categoria="documento"
        bucket="motoristas-documentos"
        label="documento"
        empresaId={empresaId}
        usuarioId={usuarioId}
      />
    </div>
  );
}
