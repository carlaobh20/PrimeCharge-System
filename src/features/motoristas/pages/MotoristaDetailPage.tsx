import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { Tabs } from '@/shared/components/ui/tabs';
import { ComentariosPanel } from '@/shared/capabilities/components/ComentariosPanel';
import { TimelinePanel } from '@/shared/capabilities/components/TimelinePanel';
import { HistoricoPanel } from '@/shared/capabilities/components/HistoricoPanel';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { PlaceholderActionDialog } from '@/shared/components/ui/placeholder-action-dialog';
import { toast } from '@/shared/components/ui/toast';

import { MotoristaCockpitHeader } from '../components/MotoristaCockpitHeader';
import { MotoristaKpiBand } from '../components/MotoristaKpiBand';
import { MotoristaSidebar } from '../components/MotoristaSidebar';
import { MotoristaCommandActions } from '../components/MotoristaCommandActions';
import { DadosGeraisTab } from '../components/tabs/DadosGeraisTab';
import { ArquivosTab } from '../components/tabs/ArquivosTab';
import { IndicadoresTab } from '../components/tabs/IndicadoresTab';
import { EventosTab } from '../components/tabs/EventosTab';
import { ConfiguracoesTab } from '../components/tabs/ConfiguracoesTab';

import { AdicionarDocumentoDialog } from '../components/dialogs/AdicionarDocumentoDialog';
import { AlterarStatusDialog } from '../components/dialogs/AlterarStatusDialog';
import { NovoComentarioDialog } from '../components/dialogs/NovoComentarioDialog';
import { NovaTagDialog } from '../components/dialogs/NovaTagDialog';

import { useDeleteMotorista, useUpdateMotoristaStatus, useMotorista } from '../hooks/useMotoristas';
import { useDriverIntelligence } from '../hooks/useDriverIntelligence';
import { PLACEHOLDER_DESCRIPTIONS, type ActionKey } from '../lib/actions';
import { MOTORISTA_STATUS_LABEL, MOTORISTA_STATUS_TRANSITIONS, type MotoristaStatus } from '../types';

const CAMPOS_LABEL: Record<string, string> = {
  status: 'Status',
  nome_completo: 'Nome completo',
  cpf: 'CPF',
  email: 'E-mail',
  telefone: 'Telefone',
  data_nascimento: 'Data de nascimento',
  cnh_numero: 'Número da CNH',
  cnh_categoria: 'Categoria da CNH',
  cnh_validade: 'Validade da CNH',
  endereco: 'Endereço',
  cidade: 'Cidade',
  estado: 'Estado',
  observacoes: 'Observações',
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

export function MotoristaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: motorista, isLoading } = useMotorista(id);
  const { data: usuario } = useCurrentUsuario();
  const updateStatus = useUpdateMotoristaStatus();
  const deleteMotorista = useDeleteMotorista();
  const intelligence = useDriverIntelligence(motorista);
  const commandActionsRef = useRef<HTMLDivElement>(null);

  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [bloqueioIndisponivel, setBloqueioIndisponivel] = useState(false);

  if (isLoading || !motorista) {
    return <CockpitSkeleton />;
  }

  function handleTransition(status: MotoristaStatus) {
    if (!id) return;
    updateStatus.mutate(
      { id, status },
      { onSuccess: () => toast.success(`Status alterado para "${MOTORISTA_STATUS_LABEL[status]}"`) }
    );
  }

  function handleExcluir() {
    if (!id) return;
    deleteMotorista.mutate(id, {
      onSuccess: () => {
        toast.success('Motorista excluído');
        navigate('/motoristas');
      },
    });
  }

  function handleAction(key: ActionKey) {
    // TS não propaga o narrowing do guard `if (!motorista) return <CockpitSkeleton />` acima
    // para dentro de closures aninhadas — este guard é redundante em runtime, mas necessário
    // pro compilador (mesmo comentário de VeiculoDetailPage).
    if (!motorista) return;

    if (key === 'bloquear') {
      // "Bloquear" reaproveita a state machine já existente: só é uma ação real se a
      // transição para "bloqueado" for válida a partir do status atual.
      if (MOTORISTA_STATUS_TRANSITIONS[motorista.status].includes('bloqueado')) {
        setActiveAction('bloquear');
      } else {
        setBloqueioIndisponivel(true);
      }
      return;
    }
    if (key === 'vincular-veiculo' || key === 'contrato') {
      // Desde a Sprint 7, os dois rótulos levam ao mesmo destino (ver comentário em
      // lib/actions.ts) — criar um contrato JÁ é a vinculação, não existe um passo à parte.
      navigate(`/contratos/novo?motoristaId=${motorista.id}`);
      return;
    }
    setActiveAction(key);
  }

  function scrollToActions() {
    commandActionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const placeholderKeys: ActionKey[] = ['cobranca', 'ocorrencia', 'relatorio'];
  const isPlaceholderOpen = placeholderKeys.includes(activeAction as ActionKey);

  const placeholderTitles: Partial<Record<ActionKey, string>> = {
    cobranca: 'Registrar cobrança',
    ocorrencia: 'Registrar ocorrência',
    relatorio: 'Gerar relatório',
  };

  return (
    <div className="space-y-6 p-6">
      <MotoristaCockpitHeader
        motorista={motorista}
        usuarioId={usuario?.id}
        empresaId={usuario?.empresa_id ?? undefined}
        onAction={handleAction}
        onExcluir={() => setConfirmExcluir(true)}
      />

      <MotoristaKpiBand motorista={motorista} healthScore={intelligence.isLoading ? null : intelligence.healthScore} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-6">
          <MotoristaCommandActions ref={commandActionsRef} onAction={handleAction} />

          <Tabs
            items={[
              { value: 'dados', label: 'Dados Gerais', content: <DadosGeraisTab motorista={motorista} /> },
              {
                value: 'timeline',
                label: 'Timeline',
                content: <TimelinePanel entidadeTipo="motorista" entidadeId={motorista.id} />,
              },
              {
                value: 'arquivos',
                label: 'Arquivos',
                content: (
                  <ArquivosTab
                    motoristaId={motorista.id}
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
                    entidadeTipo="motorista"
                    entidadeId={motorista.id}
                    empresaId={usuario?.empresa_id ?? undefined}
                    usuarioId={usuario?.id}
                  />
                ),
              },
              {
                value: 'indicadores',
                label: 'Indicadores',
                content: <IndicadoresTab resultado={intelligence} motoristaId={motorista.id} onAction={handleAction} />,
              },
              { value: 'eventos', label: 'Eventos', content: <EventosTab onAction={handleAction} /> },
              {
                value: 'historico',
                label: 'Histórico',
                content: <HistoricoPanel tabela="motoristas" registroId={motorista.id} fieldLabels={CAMPOS_LABEL} />,
              },
              { value: 'configuracoes', label: 'Configurações', content: <ConfiguracoesTab onAction={handleAction} /> },
            ]}
          />
        </div>

        <MotoristaSidebar motorista={motorista} onAction={handleAction} onScrollToActions={scrollToActions} />
      </div>

      {/* Dialogs — cada Command Action abre um só, nunca mais de um por vez (activeAction). */}
      <AlterarStatusDialog
        open={activeAction === 'status'}
        onOpenChange={(open) => setActiveAction(open ? 'status' : null)}
        status={motorista.status}
        onTransition={handleTransition}
        disabled={updateStatus.isPending}
      />
      <AdicionarDocumentoDialog
        open={activeAction === 'documento'}
        onOpenChange={(open) => setActiveAction(open ? 'documento' : null)}
        motoristaId={motorista.id}
        empresaId={usuario?.empresa_id ?? undefined}
        usuarioId={usuario?.id}
      />
      <NovoComentarioDialog
        open={activeAction === 'comentario'}
        onOpenChange={(open) => setActiveAction(open ? 'comentario' : null)}
        motoristaId={motorista.id}
        empresaId={usuario?.empresa_id ?? undefined}
        usuarioId={usuario?.id}
      />
      <NovaTagDialog
        open={activeAction === 'tag'}
        onOpenChange={(open) => setActiveAction(open ? 'tag' : null)}
        motoristaId={motorista.id}
        empresaId={usuario?.empresa_id ?? undefined}
        usuarioId={usuario?.id}
      />
      <ConfirmDialog
        open={activeAction === 'bloquear'}
        onOpenChange={(open) => setActiveAction(open ? 'bloquear' : null)}
        title="Bloquear este motorista?"
        description='Move o status para "Bloqueado" — a próxima transição válida a partir de agora.'
        confirmLabel="Bloquear"
        destructive
        onConfirm={() => {
          handleTransition('bloqueado');
          setActiveAction(null);
        }}
        isPending={updateStatus.isPending}
      />
      <PlaceholderActionDialog
        open={bloqueioIndisponivel}
        onOpenChange={setBloqueioIndisponivel}
        title="Não é possível bloquear agora"
        description='O status atual não permite ir direto para "Bloqueado". Use Alterar status para seguir a sequência correta.'
      />
      {isPlaceholderOpen && (
        <PlaceholderActionDialog
          open={isPlaceholderOpen}
          onOpenChange={(open) => setActiveAction(open ? activeAction : null)}
          title={placeholderTitles[activeAction as ActionKey] ?? 'Em breve'}
          description={PLACEHOLDER_DESCRIPTIONS[activeAction as ActionKey] ?? 'Ainda não construído.'}
        />
      )}
      <ConfirmDialog
        open={confirmExcluir}
        onOpenChange={setConfirmExcluir}
        title="Excluir este motorista?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleExcluir}
        isPending={deleteMotorista.isPending}
      />
    </div>
  );
}
