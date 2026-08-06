import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { Tabs } from '@/shared/components/ui/tabs';
import { toast } from '@/shared/components/ui/toast';
import { ComentariosPanel } from '@/shared/capabilities/components/ComentariosPanel';
import { TimelinePanel } from '@/shared/capabilities/components/TimelinePanel';
import { HistoricoPanel } from '@/shared/capabilities/components/HistoricoPanel';
import { ChecklistsPanel } from '@/features/operacoes/components/ChecklistsPanel';
import { ManutencoesPanel } from '@/features/operacoes/components/ManutencoesPanel';
import { MultasPanel } from '@/features/operacoes/components/MultasPanel';
import { NovaManutencaoDialog } from '@/features/operacoes/components/NovaManutencaoDialog';
import { NovaMultaDialog } from '@/features/operacoes/components/NovaMultaDialog';

import { VeiculoCockpitHeader } from '../components/VeiculoCockpitHeader';
import { VeiculoKpiBand } from '../components/VeiculoKpiBand';
import { VeiculoSidebar } from '../components/VeiculoSidebar';
import { VeiculoCommandActions } from '../components/VeiculoCommandActions';
import { DadosGeraisTab } from '../components/tabs/DadosGeraisTab';
import { ArquivosTab } from '../components/tabs/ArquivosTab';
import { FinanceiroTab } from '../components/tabs/FinanceiroTab';
import { IndicadoresTab } from '../components/tabs/IndicadoresTab';
import { EventosTab } from '../components/tabs/EventosTab';
import { ConfiguracoesTab } from '../components/tabs/ConfiguracoesTab';

import { AdicionarDocumentoDialog } from '../components/dialogs/AdicionarDocumentoDialog';
import { AlterarStatusDialog } from '../components/dialogs/AlterarStatusDialog';
import { NovoComentarioDialog } from '../components/dialogs/NovoComentarioDialog';
import { NovaTagDialog } from '../components/dialogs/NovaTagDialog';
import { RegistrarKmDialog } from '../components/dialogs/RegistrarKmDialog';
import { VenderVeiculoDialog } from '../components/dialogs/VenderVeiculoDialog';
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog';
import { PlaceholderActionDialog } from '../components/dialogs/PlaceholderActionDialog';

import { useDeleteVeiculo, useUpdateVeiculoStatus, useVeiculo, useVenderVeiculo } from '../hooks/useVeiculos';
import { useVehicleIntelligence } from '../hooks/useVehicleIntelligence';
import { PLACEHOLDER_DESCRIPTIONS, type ActionKey } from '../lib/actions';
import { VEICULO_STATUS_LABEL, VEICULO_STATUS_TRANSITIONS, type VeiculoStatus } from '../types';

const CAMPOS_LABEL: Record<string, string> = {
  status: 'Status',
  quilometragem: 'Quilometragem',
  cor: 'Cor',
  valor_compra: 'Valor de compra',
  valor_fipe: 'Valor FIPE',
  valor_mercado: 'Valor de mercado',
  valor_residual_estimado: 'Valor residual estimado',
  observacoes: 'Observações',
  autonomia_km: 'Autonomia',
  capacidade_bateria_kwh: 'Capacidade da bateria',
  data_compra: 'Data de compra',
  categoria: 'Categoria',
  tipo_aquisicao: 'Tipo de aquisição',
  chassi: 'Chassi',
  renavam: 'RENAVAM',
  placa: 'Placa',
};

function CockpitSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-32 cockpit-shimmer rounded-3xl" />
      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 flex-1 cockpit-shimmer rounded-2xl" />
        ))}
      </div>
      <div className="h-64 cockpit-shimmer rounded-2xl" />
    </div>
  );
}

export function VeiculoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: veiculo, isLoading } = useVeiculo(id);
  const { data: usuario } = useCurrentUsuario();
  const updateStatus = useUpdateVeiculoStatus();
  const venderVeiculo = useVenderVeiculo();
  const deleteVeiculo = useDeleteVeiculo();
  const intelligence = useVehicleIntelligence(veiculo);
  const commandActionsRef = useRef<HTMLDivElement>(null);

  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [vendaIndisponivel, setVendaIndisponivel] = useState(false);

  if (isLoading || !veiculo) {
    return <CockpitSkeleton />;
  }

  function handleTransition(status: VeiculoStatus) {
    if (!id) return;
    updateStatus.mutate(
      { id, status },
      { onSuccess: () => toast.success(`Status alterado para "${VEICULO_STATUS_LABEL[status]}"`) }
    );
  }

  function handleExcluir() {
    if (!id) return;
    deleteVeiculo.mutate(id, {
      onSuccess: () => {
        toast.success('Veículo excluído');
        navigate('/veiculos');
      },
    });
  }

  function handleVender(comprador: string, valorVenda: number, dataVenda: string) {
    if (!id) return;
    venderVeiculo.mutate(
      { id, comprador, valorVenda, dataVenda },
      {
        onSuccess: () => {
          toast.success('Venda registrada');
          setActiveAction(null);
        },
      }
    );
  }

  function handleAction(key: ActionKey) {
    // TS não propaga o narrowing do guard `if (!veiculo) return <CockpitSkeleton />` acima
    // para dentro de closures aninhadas — este guard é redundante em runtime (handleAction só
    // é alcançável depois daquele early return) mas necessário pro compilador.
    if (!veiculo) return;

    if (key === 'vender') {
      // "Vender" reaproveita a state machine já existente: só é uma ação real se a
      // transição para "venda" for válida a partir do status atual.
      if (VEICULO_STATUS_TRANSITIONS[veiculo.status].includes('venda')) {
        setActiveAction('vender');
      } else {
        setVendaIndisponivel(true);
      }
      return;
    }
    if (key === 'duplicar') {
      navigate('/veiculos/novo', {
        state: {
          origemPlaca: veiculo.placa,
          defaultValues: {
            marca_id: veiculo.marca_id,
            modelo_id: veiculo.modelo_id,
            ano_fabricacao: veiculo.ano_fabricacao,
            ano_modelo: veiculo.ano_modelo,
            cor: veiculo.cor ?? undefined,
            categoria: veiculo.categoria,
            tipo_aquisicao: veiculo.tipo_aquisicao,
            autonomia_km: veiculo.autonomia_km ?? undefined,
            capacidade_bateria_kwh: veiculo.capacidade_bateria_kwh ?? undefined,
          },
        },
      });
      return;
    }
    setActiveAction(key);
  }

  function scrollToActions() {
    commandActionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const placeholderKeys: ActionKey[] = ['abastecimento', 'relatorio', 'arquivar'];
  const isPlaceholderOpen = placeholderKeys.includes(activeAction as ActionKey);

  return (
    <div className="space-y-6 p-6">
      <VeiculoCockpitHeader
        veiculo={veiculo}
        usuarioId={usuario?.id}
        empresaId={usuario?.empresa_id ?? undefined}
        onAction={handleAction}
        onExcluir={() => setConfirmExcluir(true)}
      />

      <VeiculoKpiBand veiculo={veiculo} healthScore={intelligence.isLoading ? null : intelligence.healthScore} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-6">
          <VeiculoCommandActions ref={commandActionsRef} onAction={handleAction} />

          <Tabs
            items={[
              { value: 'dados', label: 'Dados Gerais', content: <DadosGeraisTab veiculo={veiculo} /> },
              {
                value: 'timeline',
                label: 'Timeline',
                content: <TimelinePanel entidadeTipo="veiculo" entidadeId={veiculo.id} />,
              },
              {
                value: 'arquivos',
                label: 'Arquivos',
                content: (
                  <ArquivosTab
                    veiculoId={veiculo.id}
                    empresaId={usuario?.empresa_id ?? undefined}
                    usuarioId={usuario?.id}
                  />
                ),
              },
              {
                value: 'comentarios',
                label: 'Comentários',
                content: (
                  <ComentariosPanel
                    entidadeTipo="veiculo"
                    entidadeId={veiculo.id}
                    empresaId={usuario?.empresa_id ?? undefined}
                    usuarioId={usuario?.id}
                  />
                ),
              },
              { value: 'financeiro', label: 'Financeiro', content: <FinanceiroTab veiculo={veiculo} /> },
              {
                value: 'checklists',
                label: 'Checklists',
                content: <ChecklistsPanel entidadeTipo="veiculo" entidadeId={veiculo.id} />,
              },
              {
                value: 'manutencoes',
                label: 'Manutenções',
                content: <ManutencoesPanel veiculoId={veiculo.id} />,
              },
              {
                value: 'multas',
                label: 'Multas',
                content: <MultasPanel veiculoId={veiculo.id} />,
              },
              {
                value: 'indicadores',
                label: 'Indicadores',
                content: <IndicadoresTab resultado={intelligence} veiculoId={veiculo.id} onAction={handleAction} />,
              },
              { value: 'eventos', label: 'Eventos', content: <EventosTab onAction={handleAction} /> },
              {
                value: 'historico',
                label: 'Histórico',
                content: <HistoricoPanel tabela="veiculos" registroId={veiculo.id} fieldLabels={CAMPOS_LABEL} />,
              },
              { value: 'configuracoes', label: 'Configurações', content: <ConfiguracoesTab onAction={handleAction} /> },
            ]}
          />
        </div>

        <VeiculoSidebar veiculo={veiculo} onAction={handleAction} onScrollToActions={scrollToActions} />
      </div>

      {/* Dialogs — cada Command Action abre um só, nunca mais de um por vez (activeAction). */}
      <AlterarStatusDialog
        open={activeAction === 'status'}
        onOpenChange={(open) => setActiveAction(open ? 'status' : null)}
        status={veiculo.status}
        onTransition={handleTransition}
        disabled={updateStatus.isPending}
      />
      <AdicionarDocumentoDialog
        open={activeAction === 'documento'}
        onOpenChange={(open) => setActiveAction(open ? 'documento' : null)}
        veiculoId={veiculo.id}
        empresaId={usuario?.empresa_id ?? undefined}
        usuarioId={usuario?.id}
      />
      <NovoComentarioDialog
        open={activeAction === 'comentario'}
        onOpenChange={(open) => setActiveAction(open ? 'comentario' : null)}
        veiculoId={veiculo.id}
        empresaId={usuario?.empresa_id ?? undefined}
        usuarioId={usuario?.id}
      />
      <NovaTagDialog
        open={activeAction === 'tag'}
        onOpenChange={(open) => setActiveAction(open ? 'tag' : null)}
        veiculoId={veiculo.id}
        empresaId={usuario?.empresa_id ?? undefined}
        usuarioId={usuario?.id}
      />
      <RegistrarKmDialog
        open={activeAction === 'km'}
        onOpenChange={(open) => setActiveAction(open ? 'km' : null)}
        veiculoId={veiculo.id}
        quilometragemAtual={veiculo.quilometragem}
      />
      <NovaManutencaoDialog
        open={activeAction === 'manutencao'}
        onOpenChange={(open) => setActiveAction(open ? 'manutencao' : null)}
        veiculoId={veiculo.id}
      />
      <NovaMultaDialog
        open={activeAction === 'multa'}
        onOpenChange={(open) => setActiveAction(open ? 'multa' : null)}
        veiculoId={veiculo.id}
      />
      <VenderVeiculoDialog
        open={activeAction === 'vender'}
        onOpenChange={(open) => setActiveAction(open ? 'vender' : null)}
        onConfirm={handleVender}
        isPending={venderVeiculo.isPending}
      />
      <PlaceholderActionDialog
        open={vendaIndisponivel}
        onOpenChange={setVendaIndisponivel}
        title="Não é possível vender agora"
        description='O status atual não permite ir direto para "Em venda". Use Alterar status para seguir a sequência correta antes de vender.'
      />
      {isPlaceholderOpen && (
        <PlaceholderActionDialog
          open={isPlaceholderOpen}
          onOpenChange={(open) => setActiveAction(open ? activeAction : null)}
          title={
            activeAction === 'abastecimento'
              ? 'Registrar abastecimento'
              : activeAction === 'relatorio'
                ? 'Gerar relatório'
                : 'Arquivar'
          }
          description={PLACEHOLDER_DESCRIPTIONS[activeAction as ActionKey] ?? 'Ainda não construído.'}
        />
      )}
      <ConfirmDialog
        open={confirmExcluir}
        onOpenChange={setConfirmExcluir}
        title="Excluir este veículo?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleExcluir}
        isPending={deleteVeiculo.isPending}
      />
    </div>
  );
}
