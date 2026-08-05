import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Tabs } from '@/shared/components/ui/tabs';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { ArquivosPanel } from '@/shared/capabilities/components/ArquivosPanel';
import { ComentariosPanel } from '@/shared/capabilities/components/ComentariosPanel';
import { TagsPanel } from '@/shared/capabilities/components/TagsPanel';
import { TimelinePanel } from '@/shared/capabilities/components/TimelinePanel';
import { FavoritoButton } from '@/shared/capabilities/components/FavoritoButton';
import { StatusBadge } from '../components/StatusBadge';
import { StatusTransitionMenu } from '../components/StatusTransitionMenu';
import { useDeleteVeiculo, useUpdateVeiculoStatus, useVeiculo } from '../hooks/useVeiculos';
import { TIPO_AQUISICAO_LABEL, VEICULO_CATEGORIA_LABEL, type VeiculoStatus } from '../types';

function formatMoeda(valor: number | null) {
  if (valor === null) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function VeiculoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: veiculo, isLoading } = useVeiculo(id);
  const { data: usuario } = useCurrentUsuario();
  const updateStatus = useUpdateVeiculoStatus();
  const deleteVeiculo = useDeleteVeiculo();

  if (isLoading || !veiculo) {
    return <div className="p-8 text-sm text-neutral-500">Carregando…</div>;
  }

  function handleTransition(status: VeiculoStatus) {
    if (!id) return;
    updateStatus.mutate({ id, status });
  }

  function handleDelete() {
    if (!id) return;
    if (!window.confirm('Excluir este veículo? Esta ação não pode ser desfeita.')) return;
    deleteVeiculo.mutate(id, { onSuccess: () => navigate('/veiculos') });
  }

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{veiculo.placa}</h1>
            <StatusBadge status={veiculo.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {veiculo.marca?.nome} {veiculo.modelo?.nome} · {veiculo.ano_fabricacao}/{veiculo.ano_modelo}
          </p>
          <div className="mt-2">
            <FavoritoButton
              entidadeTipo="veiculo"
              entidadeId={veiculo.id}
              usuarioId={usuario?.id}
              empresaId={usuario?.empresa_id ?? undefined}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusTransitionMenu status={veiculo.status} onTransition={handleTransition} disabled={updateStatus.isPending} />
          <Link to={`/veiculos/${veiculo.id}/editar`} className="inline-flex">
            <Button type="button" variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </Link>
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleteVeiculo.isPending}>
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-xs font-medium uppercase text-neutral-500">Identificação</h3>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-500">Chassi</dt><dd>{veiculo.chassi}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">RENAVAM</dt><dd>{veiculo.renavam}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Cor</dt><dd>{veiculo.cor ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Categoria</dt><dd>{VEICULO_CATEGORIA_LABEL[veiculo.categoria]}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <h3 className="text-xs font-medium uppercase text-neutral-500">Uso e autonomia</h3>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-500">Quilometragem</dt><dd>{veiculo.quilometragem.toLocaleString('pt-BR')} km</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Autonomia</dt><dd>{veiculo.autonomia_km ? `${veiculo.autonomia_km} km` : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Bateria</dt><dd>{veiculo.capacidade_bateria_kwh ? `${veiculo.capacidade_bateria_kwh} kWh` : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Aquisição</dt><dd>{TIPO_AQUISICAO_LABEL[veiculo.tipo_aquisicao]}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <h3 className="text-xs font-medium uppercase text-neutral-500">Valores</h3>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-500">Compra</dt><dd>{formatMoeda(veiculo.valor_compra)}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">FIPE</dt><dd>{formatMoeda(veiculo.valor_fipe)}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Mercado</dt><dd>{formatMoeda(veiculo.valor_mercado)}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Residual estimado</dt><dd>{formatMoeda(veiculo.valor_residual_estimado)}</dd></div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {veiculo.observacoes && (
        <Card className="mt-4">
          <CardContent className="pt-4">
            <h3 className="text-xs font-medium uppercase text-neutral-500">Observações</h3>
            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{veiculo.observacoes}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-8">
        <Tabs
          items={[
            {
              value: 'fotos',
              label: 'Fotos',
              content: (
                <ArquivosPanel
                  entidadeTipo="veiculo"
                  entidadeId={veiculo.id}
                  categoria="foto"
                  bucket="veiculos-fotos"
                  accept="image/*"
                  label="foto"
                  empresaId={usuario?.empresa_id ?? undefined}
                  usuarioId={usuario?.id}
                />
              ),
            },
            {
              value: 'documentos',
              label: 'Documentos',
              content: (
                <ArquivosPanel
                  entidadeTipo="veiculo"
                  entidadeId={veiculo.id}
                  categoria="documento"
                  bucket="veiculos-documentos"
                  label="documento"
                  empresaId={usuario?.empresa_id ?? undefined}
                  usuarioId={usuario?.id}
                />
              ),
            },
            {
              value: 'timeline',
              label: 'Timeline',
              content: <TimelinePanel entidadeTipo="veiculo" entidadeId={veiculo.id} />,
            },
            {
              value: 'comentarios',
              label: 'Comentários',
              content: (
                <ComentariosPanel
                  entidadeTipo="veiculo"
                  entidadeId={veiculo.id}
                  usuarioId={usuario?.id}
                  empresaId={usuario?.empresa_id ?? undefined}
                />
              ),
            },
            {
              value: 'tags',
              label: 'Tags',
              content: (
                <TagsPanel
                  entidadeTipo="veiculo"
                  entidadeId={veiculo.id}
                  usuarioId={usuario?.id}
                  empresaId={usuario?.empresa_id ?? undefined}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
