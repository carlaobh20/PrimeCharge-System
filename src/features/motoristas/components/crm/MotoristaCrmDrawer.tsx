import { Drawer } from '@/shared/components/ui/drawer';
import { Tabs } from '@/shared/components/ui/tabs';
import { Badge } from '@/shared/components/ui/badge';
import { TimelinePanel } from '@/shared/capabilities/components/TimelinePanel';
import { diasDesde } from '@/shared/lib/format';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useMotorista } from '../../hooks/useMotoristas';
import { useDriverIntelligence } from '../../hooks/useDriverIntelligence';
import { diasNaEtapa } from '../../intelligence/funilMetrics';
import { ArquivosTab } from '../tabs/ArquivosTab';
import { StatusBadge } from '../StatusBadge';
import { MOTORISTA_ETAPA_FUNIL_LABEL, MOTORISTA_PRIORIDADE_COLOR, MOTORISTA_PRIORIDADE_LABEL } from '../../types';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  );
}

// Épico 6 — CRM, Fase 1. Aba "Resumo": só o que já é dado real e barato de calcular (score já
// existente, tempo de empresa, status/etapa/prioridade). Receita/lucro gerados, dias
// alugados/parado, multas, sinistros, avaliação, pontualidade (pedidos no brief) ficam pra
// Fase 2 — a maioria já existe em algum lugar (frota/intelligence/historicoMotoristas.ts tem
// receita/lucro por motorista, por exemplo), mas juntar tudo aqui é build novo, não é
// "básico" no sentido que a Fase 1 pediu.
function ResumoTab({ motoristaId }: { motoristaId: string }) {
  const { data: motorista, isLoading } = useMotorista(motoristaId);
  const intelligence = useDriverIntelligence(motorista);

  if (isLoading || !motorista) return <div className="h-32 cockpit-shimmer rounded-2xl" />;

  const dias = diasNaEtapa(motorista);
  const diasComoCliente = diasDesde(motorista.criado_em);
  const score = !intelligence.isLoading ? intelligence.driverScore.overall : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Score PrimeCharge" value={score !== null ? `${score}/100` : '—'} />
        <Stat label="Tempo de empresa" value={diasComoCliente !== null ? `${diasComoCliente} dia(s)` : '—'} />
        <Stat label="Dias na etapa atual" value={dias !== null ? `${dias} dia(s)` : '—'} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={motorista.status} />
        <Badge variant="secondary">{motorista.etapa_funil ? MOTORISTA_ETAPA_FUNIL_LABEL[motorista.etapa_funil] : 'Não classificado'}</Badge>
        <Badge variant={MOTORISTA_PRIORIDADE_COLOR[motorista.prioridade]}>{MOTORISTA_PRIORIDADE_LABEL[motorista.prioridade]}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Telefone" value={motorista.telefone ?? '—'} />
        <Stat label="Cidade" value={motorista.cidade ?? '—'} />
        <Stat label="CNH válida até" value={motorista.cnh_validade ?? '—'} />
      </div>
      <p className="text-[11px] text-neutral-400">
        Receita/lucro gerados, dias alugados/parado, multas, sinistros e avaliação entram numa próxima fase — a maior parte já existe em outro
        lugar do sistema, falta só juntar aqui.
      </p>
    </div>
  );
}

export function MotoristaCrmDrawer({ motoristaId, onOpenChange }: { motoristaId: string | null; onOpenChange: (open: boolean) => void }) {
  const { data: motorista } = useMotorista(motoristaId ?? undefined);
  const { data: usuario } = useCurrentUsuario();

  return (
    <Drawer open={motoristaId !== null} onOpenChange={onOpenChange} title={motorista?.nome_completo ?? 'Motorista'} description="Jornada do motorista">
      {motoristaId && (
        <Tabs
          items={[
            { value: 'resumo', label: 'Resumo', content: <ResumoTab motoristaId={motoristaId} /> },
            { value: 'timeline', label: 'Timeline', content: <TimelinePanel entidadeTipo="motorista" entidadeId={motoristaId} /> },
            {
              value: 'documentos',
              label: 'Documentos',
              content: <ArquivosTab motoristaId={motoristaId} empresaId={usuario?.empresa_id ?? undefined} usuarioId={usuario?.id ?? undefined} />,
            },
          ]}
        />
      )}
    </Drawer>
  );
}
