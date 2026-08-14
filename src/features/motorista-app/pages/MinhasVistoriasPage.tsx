import { Link } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { formatDataSimples } from '@/shared/lib/format';
import { buttonVariants } from '@/shared/components/ui/button';
import { Secao, Pill, SkeletonPortal, ErroPortal, VazioPortal } from '../components/ui';
import { useMinhasVistorias } from '../hooks/useMotoristaApp';
import type { MinhaVistoria } from '../api/vistorias';

// Épico 11 — App do Motorista. Tela "Vistorias": lista as vistorias de entrega/devolução do
// próprio contrato. Só leitura; toque abre o detalhe.

// Label do tipo de vistoria.
const TIPO_LABEL: Record<string, string> = {
  entrega: 'Entrega',
  devolucao: 'Devolução',
};
function labelTipo(tipo: string | null): string | null {
  if (!tipo) return null;
  return TIPO_LABEL[tipo] ?? tipo;
}

// Pill de status: concluído = verde; aberto = âmbar; cancelado = neutro.
function tomStatus(status: string): 'verde' | 'ambar' | 'neutro' {
  if (status === 'concluido') return 'verde';
  if (status === 'aberto') return 'ambar';
  return 'neutro';
}
function labelStatus(status: string): string {
  if (status === 'concluido') return 'Concluída';
  // Vistoria do motorista enviada fica 'aberto' aguardando o staff — mostramos "Em análise".
  if (status === 'aberto') return 'Em análise';
  if (status === 'cancelado') return 'Cancelada';
  return status;
}

function ItemVistoria({ vistoria }: { vistoria: MinhaVistoria }) {
  const tipo = labelTipo(vistoria.tipo);
  const data = vistoria.concluido_em ?? vistoria.criado_em;
  return (
    <Link
      to={`/motorista/vistorias/${vistoria.id}`}
      className="flex items-center justify-between gap-3 py-3 transition-colors hover:opacity-80"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{vistoria.titulo}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {tipo && <span className="text-xs text-neutral-500">{tipo}</span>}
          <span className="text-xs text-neutral-500">· {formatDataSimples(data)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Pill tom={tomStatus(vistoria.status)}>{labelStatus(vistoria.status)}</Pill>
        <ChevronRight className="h-4 w-4 text-neutral-400" />
      </div>
    </Link>
  );
}

export function MinhasVistoriasPage() {
  const { data, isLoading, isError, refetch } = useMinhasVistorias();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Vistorias</h1>
        <Link to="/motorista/vistorias/nova" className={buttonVariants({ size: 'sm' })}>
          <Plus className="mr-1 h-4 w-4" /> Nova vistoria
        </Link>
      </div>

      {isLoading ? (
        <SkeletonPortal />
      ) : isError ? (
        <ErroPortal onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <VazioPortal>Nenhuma vistoria registrada.</VazioPortal>
      ) : (
        <Secao titulo="Minhas vistorias">
          <div className="divide-y divide-neutral-100 dark:divide-white/5">
            {data.map((v) => (
              <ItemVistoria key={v.id} vistoria={v} />
            ))}
          </div>
        </Secao>
      )}
    </div>
  );
}
