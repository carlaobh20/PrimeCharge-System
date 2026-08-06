import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useCopyPageLink } from '@/shared/hooks/useCopyPageLink';
import { Tabs } from '@/shared/components/ui/tabs';
import { ComentariosPanel } from '@/shared/capabilities/components/ComentariosPanel';
import { TimelinePanel } from '@/shared/capabilities/components/TimelinePanel';
import { HistoricoPanel } from '@/shared/capabilities/components/HistoricoPanel';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { PlaceholderActionDialog } from '@/shared/components/ui/placeholder-action-dialog';
import { toast } from '@/shared/components/ui/toast';

import { ContratoCockpitHeader } from '../components/ContratoCockpitHeader';
import { ContratoKpiBand } from '../components/ContratoKpiBand';
import { ContratoSidebar } from '../components/ContratoSidebar';
import { ContratoCommandActions } from '../components/ContratoCommandActions';
import { DadosGeraisTab } from '../components/tabs/DadosGeraisTab';
import { ArquivosTab } from '../components/tabs/ArquivosTab';
import { IndicadoresTab } from '../components/tabs/IndicadoresTab';
import { EventosTab } from '../components/tabs/EventosTab';
import { ConfiguracoesTab } from '../components/tabs/ConfiguracoesTab';

import { AlterarStatusDialog } from '../components/dialogs/AlterarStatusDialog';
import { AtivarContratoDialog } from '../components/dialogs/AtivarContratoDialog';
import { EncerrarContratoDialog } from '../components/dialogs/EncerrarContratoDialog';
import { RenovarContratoDialog } from '../components/dialogs/RenovarContratoDialog';
import { AdicionarDocumentoDialog } from '../components/dialogs/AdicionarDocumentoDialog';
import { NovoComentarioDialog } from '../components/dialogs/NovoComentarioDialog';
import { NovaTagDialog } from '../components/dialogs/NovaTagDialog';

import {
  useAtivarContrato,
  useContrato,
  useDeleteContrato,
  useEncerrarContrato,
  useRenovarContrato,
  useUpdateContratoStatus,
} from '../hooks/useContratos';
import { useContractIntelligence } from '../hooks/useContractIntelligence';
import { PLACEHOLDER_DESCRIPTIONS, type ActionKey } from '../lib/actions';
import { CONTRATO_STATUS_LABEL, CONTRATO_STATUS_TRANSITIONS, type ContratoStatus } from '../types';

const CAMPOS_LABEL: Record<string, string> = {
  status: 'Status',
  data_inicio: 'Data de início',
  data_fim_prevista: 'Data de fim prevista',
  data_fim_real: 'Data de fim real',
  periodicidade: 'Periodicidade',
  valor_periodico: 'Valor por período',
  valor_caucao: 'Caução',
  km_inicial: 'Quilometragem inicial',
  km_final: 'Quilometragem final',
  carga_inicial_pct: 'Carga na entrega',
  carga_final_pct: 'Carga na devolução',
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

export function ContratoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contrato, isLoading } = useContrato(id);
  const { data: usuario } = useCurrentUsuario();
  const updateStatus = useUpdateContratoStatus();
  const ativar = useAtivarContrato();
  const encerrar = useEncerrarContrato();
  const renovar = useRenovarContrato();
  const deleteContrato = useDeleteContrato();
  const intelligence = useContractIntelligence(contrato);
  const { copiar } = useCopyPageLink();
  const commandActionsRef = useRef<HTMLDivElement>(null);

  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [encerrarIndisponivel, setEncerrarIndisponivel] = useState(false);
  const [cancelarIndisponivel, setCancelarIndisponivel] = useState(false);
  const [renovarIndisponivel, setRenovarIndisponivel] = useState(false);

  if (isLoading || !contrato) {
    return <CockpitSkeleton />;
  }

  function handleTransition(status: ContratoStatus) {
    if (!id || !contrato) return;
    // Entrega real do veículo (achado da auditoria de jornada da Missão 4): a transição
    // assinado→ativo é o momento físico da entrega. Se km_inicial/carga_inicial_pct ainda não
    // foram capturados (fluxo normal — foram deixados em branco na criação), abre o dialog em
    // vez de ativar sem esse dado; se já foram preenchidos (fluxo antigo), segue direto.
    if (status === 'ativo' && (contrato.km_inicial === null || contrato.carga_inicial_pct === null)) {
      setActiveAction('ativar');
      return;
    }
    updateStatus.mutate(
      { id, status },
      { onSuccess: () => toast.success(`Status alterado para "${CONTRATO_STATUS_LABEL[status]}"`) }
    );
  }

  function handleAtivar(kmInicial: number, cargaInicialPct: number) {
    if (!id) return;
    ativar.mutate(
      { id, kmInicial, cargaInicialPct },
      {
        onSuccess: () => {
          toast.success('Entrega registrada — contrato ativo');
          setActiveAction(null);
        },
      }
    );
  }

  function handleEncerrar(kmFinal: number, cargaFinalPct: number) {
    if (!id) return;
    encerrar.mutate(
      { id, kmFinal, cargaFinalPct },
      {
        onSuccess: () => {
          toast.success('Contrato encerrado');
          setActiveAction(null);
        },
      }
    );
  }

  function handleRenovar(novaDataFimPrevista: string) {
    if (!id) return;
    renovar.mutate(
      { id, novaDataFimPrevista },
      {
        onSuccess: () => {
          toast.success('Contrato renovado');
          setActiveAction(null);
        },
      }
    );
  }

  function handleExcluir() {
    if (!id) return;
    deleteContrato.mutate(id, {
      onSuccess: () => {
        toast.success('Contrato excluído');
        navigate('/contratos');
      },
    });
  }

  function handleAction(key: ActionKey) {
    // TS não propaga o narrowing do guard `if (!contrato) return <CockpitSkeleton />` acima
    // para dentro de closures aninhadas — este guard é redundante em runtime, mas necessário
    // pro compilador (mesmo comentário de VeiculoDetailPage/MotoristaDetailPage).
    if (!contrato) return;

    // "Encerrar", "Cancelar" e "Renovar" reaproveitam a state machine já existente: só são
    // ações reais se a transição correspondente for válida a partir do status atual — nenhum
    // atalho pula a validação que também existe no banco (fn_validar_transicao_contrato).
    if (key === 'encerrar') {
      if (CONTRATO_STATUS_TRANSITIONS[contrato.status].includes('encerrado')) {
        setActiveAction('encerrar');
      } else {
        setEncerrarIndisponivel(true);
      }
      return;
    }
    if (key === 'cancelar') {
      if (CONTRATO_STATUS_TRANSITIONS[contrato.status].includes('cancelado')) {
        setActiveAction('cancelar');
      } else {
        setCancelarIndisponivel(true);
      }
      return;
    }
    if (key === 'renovar') {
      if (contrato.status === 'ativo') {
        setActiveAction('renovar');
      } else {
        setRenovarIndisponivel(true);
      }
      return;
    }
    if (key === 'compartilhar') {
      // Sem dialog — copia o link da página, mesmo comportamento do botão "Compartilhar" do
      // header/sidebar (useCopyPageLink, hoisted na Sprint 6/DEC-025).
      copiar();
      return;
    }
    if (key === 'pagamento') {
      // Antes da Missão 2 (2026-08-06) isto era um placeholder — a página de Pagamentos não
      // existia em lugar nenhum da aplicação (achado crítico #1 da auditoria). Navega para a
      // visão global em vez de um dialog específico do contrato: Pagamento se relaciona com
      // Lançamento, não com Contrato diretamente, e a tela já suporta criar o pagamento certo.
      navigate('/financeiro/pagamentos');
      return;
    }
    setActiveAction(key);
  }

  function scrollToActions() {
    commandActionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const placeholderKeys: ActionKey[] = ['atraso', 'enviar'];
  const isPlaceholderOpen = placeholderKeys.includes(activeAction as ActionKey);

  const placeholderTitles: Partial<Record<ActionKey, string>> = {
    pagamento: 'Registrar pagamento',
    atraso: 'Registrar atraso',
    enviar: 'Enviar contrato',
  };

  return (
    <div className="space-y-6 p-6">
      <ContratoCockpitHeader
        contrato={contrato}
        usuarioId={usuario?.id}
        empresaId={usuario?.empresa_id ?? undefined}
        onAction={handleAction}
        onExcluir={() => setConfirmExcluir(true)}
      />

      <ContratoKpiBand contrato={contrato} healthScore={intelligence.isLoading ? null : intelligence.healthScore} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-6">
          <ContratoCommandActions ref={commandActionsRef} onAction={handleAction} />

          <Tabs
            items={[
              { value: 'dados', label: 'Dados Gerais', content: <DadosGeraisTab contrato={contrato} /> },
              {
                value: 'timeline',
                label: 'Timeline',
                content: <TimelinePanel entidadeTipo="contrato" entidadeId={contrato.id} />,
              },
              {
                value: 'arquivos',
                label: 'Arquivos',
                content: (
                  <ArquivosTab contratoId={contrato.id} empresaId={usuario?.empresa_id ?? undefined} usuarioId={usuario?.id} />
                ),
              },
              {
                value: 'comentarios',
                label: 'Comentários',
                content: (
                  <ComentariosPanel
                    entidadeTipo="contrato"
                    entidadeId={contrato.id}
                    empresaId={usuario?.empresa_id ?? undefined}
                    usuarioId={usuario?.id}
                  />
                ),
              },
              {
                value: 'indicadores',
                label: 'Indicadores',
                content: <IndicadoresTab resultado={intelligence} contratoId={contrato.id} onAction={handleAction} />,
              },
              { value: 'eventos', label: 'Eventos', content: <EventosTab onAction={handleAction} /> },
              {
                value: 'historico',
                label: 'Histórico',
                content: <HistoricoPanel tabela="contratos" registroId={contrato.id} fieldLabels={CAMPOS_LABEL} />,
              },
              { value: 'configuracoes', label: 'Configurações', content: <ConfiguracoesTab onAction={handleAction} /> },
            ]}
          />
        </div>

        <ContratoSidebar contrato={contrato} onAction={handleAction} onScrollToActions={scrollToActions} />
      </div>

      {/* Dialogs — cada Command Action abre um só, nunca mais de um por vez (activeAction). */}
      <AlterarStatusDialog
        open={activeAction === 'status'}
        onOpenChange={(open) => setActiveAction(open ? 'status' : null)}
        status={contrato.status}
        onTransition={handleTransition}
        disabled={updateStatus.isPending}
      />
      <RenovarContratoDialog
        open={activeAction === 'renovar'}
        onOpenChange={(open) => setActiveAction(open ? 'renovar' : null)}
        dataFimAtual={contrato.data_fim_prevista}
        onConfirm={handleRenovar}
        isPending={renovar.isPending}
      />
      <AdicionarDocumentoDialog
        open={activeAction === 'documento'}
        onOpenChange={(open) => setActiveAction(open ? 'documento' : null)}
        contratoId={contrato.id}
        empresaId={usuario?.empresa_id ?? undefined}
        usuarioId={usuario?.id}
      />
      <NovoComentarioDialog
        open={activeAction === 'comentario'}
        onOpenChange={(open) => setActiveAction(open ? 'comentario' : null)}
        contratoId={contrato.id}
        empresaId={usuario?.empresa_id ?? undefined}
        usuarioId={usuario?.id}
      />
      <NovaTagDialog
        open={activeAction === 'tag'}
        onOpenChange={(open) => setActiveAction(open ? 'tag' : null)}
        contratoId={contrato.id}
        empresaId={usuario?.empresa_id ?? undefined}
        usuarioId={usuario?.id}
      />
      <AtivarContratoDialog
        open={activeAction === 'ativar'}
        onOpenChange={(open) => setActiveAction(open ? 'ativar' : null)}
        onConfirm={handleAtivar}
        isPending={ativar.isPending}
      />
      <EncerrarContratoDialog
        open={activeAction === 'encerrar'}
        onOpenChange={(open) => setActiveAction(open ? 'encerrar' : null)}
        contrato={contrato}
        onConfirm={handleEncerrar}
        isPending={encerrar.isPending}
      />
      <ConfirmDialog
        open={activeAction === 'cancelar'}
        onOpenChange={(open) => setActiveAction(open ? 'cancelar' : null)}
        title="Cancelar este contrato?"
        description="Esta transição é final — não há como voltar para um contrato cancelado."
        confirmLabel="Cancelar contrato"
        destructive
        onConfirm={() => {
          handleTransition('cancelado');
          setActiveAction(null);
        }}
        isPending={updateStatus.isPending}
      />
      <PlaceholderActionDialog
        open={encerrarIndisponivel}
        onOpenChange={setEncerrarIndisponivel}
        title="Não é possível encerrar agora"
        description='O status atual não permite ir direto para "Encerrado". Use Alterar status para seguir a sequência correta.'
      />
      <PlaceholderActionDialog
        open={cancelarIndisponivel}
        onOpenChange={setCancelarIndisponivel}
        title="Não é possível cancelar agora"
        description="Este contrato já está em um status final e não pode mais ser cancelado."
      />
      <PlaceholderActionDialog
        open={renovarIndisponivel}
        onOpenChange={setRenovarIndisponivel}
        title="Não é possível renovar agora"
        description='Renovação só está disponível quando o contrato está "Ativo". Use Alterar status para chegar lá primeiro.'
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
        title="Excluir este contrato?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleExcluir}
        isPending={deleteContrato.isPending}
      />
    </div>
  );
}
