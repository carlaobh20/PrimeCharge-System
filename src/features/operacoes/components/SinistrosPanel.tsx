import { useState } from 'react';
import { Plus, CarFront } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { formatDataSimples } from '@/shared/lib/format';
import { useSinistrosPorVeiculo } from '../hooks/useSinistros';
import { NovoSinistroDialog } from './NovoSinistroDialog';
import { labelTipoSinistro, type Sinistro } from '../types';

// Painel de Sinistros no Cockpit do Veículo (staff). Leitura + registro manual sobre a tabela
// `sinistros` (RLS staff-only já existente). Sinistros criados automaticamente pela vistoria de
// devolução também aparecem aqui — antes desta tela ficavam invisíveis no produto.
function SinistroRow({ sinistro }: { sinistro: Sinistro }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 dark:border-white/10">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="warning">{labelTipoSinistro(sinistro.tipo)}</Badge>
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {sinistro.descricao || 'Sem descrição'}
          </p>
        </div>
        <p className="mt-1 text-xs text-neutral-500">{formatDataSimples(sinistro.data_ocorrencia)}</p>
      </div>
    </div>
  );
}

export function SinistrosPanel({ veiculoId }: { veiculoId: string }) {
  const { data: sinistros, isLoading } = useSinistrosPorVeiculo(veiculoId);
  const [dialogAberto, setDialogAberto] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {(sinistros?.length ?? 0) > 0 && <p className="text-xs text-neutral-500">{sinistros!.length} sinistro(s) registrado(s)</p>}
        <div className="ml-auto">
          <Button type="button" size="sm" onClick={() => setDialogAberto(true)}>
            <Plus className="h-4 w-4" />
            Registrar sinistro
          </Button>
        </div>
      </div>

      {isLoading && <div className="h-32 cockpit-shimmer rounded-2xl" />}

      {!isLoading && (sinistros?.length ?? 0) === 0 && (
        <EmptyState
          icon={CarFront}
          title="Nenhum sinistro registrado"
          description="Colisões, roubos e avarias ficam aqui — incluindo os detectados automaticamente na vistoria de devolução."
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => setDialogAberto(true)}>
              Registrar sinistro
            </Button>
          }
        />
      )}

      {!isLoading && (sinistros?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {sinistros!.map((s) => (
            <SinistroRow key={s.id} sinistro={s} />
          ))}
        </div>
      )}

      <NovoSinistroDialog open={dialogAberto} onOpenChange={setDialogAberto} veiculoId={veiculoId} />
    </div>
  );
}
