import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { Tabs } from '@/shared/components/ui/tabs';
import { ComentariosPanel } from '@/shared/capabilities/components/ComentariosPanel';
import { TimelinePanel } from '@/shared/capabilities/components/TimelinePanel';
import { HistoricoPanel } from '@/shared/capabilities/components/HistoricoPanel';

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
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog';
import { PlaceholderActionDialog } from '../components/dialogs/PlaceholderActionDialog';

import { useDeleteVeiculo, useUpdateVeiculoStatus, useVeiculo } from '../hooks/useVeiculos';
import { PLACEHOLDER_DESCRIPTIONS, type ActionKey } from '../lib/actions';
import { VEICULO_STATUS_TRANSITIONS, type VeiculoStatus } from '../types';

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
  const deleteVeiculo = useDeleteVeiculo();
  const commandActionsRef = useRef<HTMLDivElement>(null);

  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [vendaIndisponivel, setVendaIndisponivel] = useState(false);

  if (isLoading || !veiculo) {
    return <CockpitSkeleton />;
  }

  function handleTransition(status: VeiculoStatus) {
    if (!id) return;
    updateStatus.mutate({ id, status });
  }

  function handleExcluir() {
    if (!id) return;
    deleteVeiculo.mutate(id, { onSuccess: () => navigate('/veiculos') });
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

  const placeholderKeys: ActionKey[] = ['manutencao', 'abastecimento', 'relatorio', 'arquivar'];
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

      <VeiculoKpiBand veiculo={veiculo} />

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
              { value: 'financeiro', label: 'Financeiro', content: <FinanceiroTab onAction={handleAction} /> },
              {
                value: 'indicadores',
                label: 'Indicadores',
                content: <IndicadoresTab onVerKpis={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />,
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
      <ConfirmDialog
        open={activeAction === 'vender'}
        onOpenChange={(open) => setActiveAction(open ? 'vender' : null)}
        title="Vender este veículo?"
        description='Move o status para "Em venda" — a próxima transição válida a partir de agora.'
        confirmLabel="Marcar como em venda"
        onConfirm={() => {
          handleTransition('venda');
          setActiveAction(null);
        }}
        isPending={updateStatus.isPending}
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
            activeAction === 'manutencao'
              ? 'Registrar manutenção'
              : activeAction === 'abastecimento'
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
