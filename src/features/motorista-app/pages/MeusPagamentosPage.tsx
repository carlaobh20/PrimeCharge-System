import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatMoeda, formatDataSimples } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Secao, Pill, SkeletonPortal, ErroPortal, VazioPortal } from '@/features/motorista-app/components/ui';
import { useMinhasCobrancas } from '@/features/motorista-app/hooks/useMotoristaApp';
import {
  statusDaCobranca,
  STATUS_COBRANCA_LABEL,
  proximaCobranca,
  type StatusCobranca,
} from '@/features/motorista-app/lib/statusCobranca';
import type { MeuLancamento } from '@/features/motorista-app/api/pagamentos';

// Épico 11 — App do Motorista. Tela "Pagamentos": próxima cobrança em destaque, filtros por
// situação e lista de cobranças. MOTOR (statusCobranca) deriva o status; a tela só apresenta.

// Tom da pill por status derivado.
const TOM_STATUS: Record<StatusCobranca, 'verde' | 'azul' | 'vermelho' | 'neutro'> = {
  pago: 'verde',
  em_aberto: 'azul',
  vencido: 'vermelho',
  cancelado: 'neutro',
};

// Filtros disponíveis. 'todos' não filtra; os demais casam com o status derivado.
type Filtro = 'todos' | 'em_aberto' | 'pago' | 'vencido';
const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'em_aberto', label: 'Em aberto' },
  { id: 'pago', label: 'Pagos' },
  { id: 'vencido', label: 'Vencidos' },
];

// Um item da lista de cobranças: link para o detalhe.
function ItemCobranca({ lancamento }: { lancamento: MeuLancamento }) {
  const status = statusDaCobranca(lancamento);
  return (
    <Link
      to={`/motorista/pagamentos/${lancamento.id}`}
      className="flex items-center gap-3 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.02]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{lancamento.descricao}</p>
        <p className="mt-0.5 text-xs text-neutral-500">Vence em {formatDataSimples(lancamento.data_prevista)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{formatMoeda(lancamento.valor)}</span>
        <Pill tom={TOM_STATUS[status]}>{STATUS_COBRANCA_LABEL[status]}</Pill>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
    </Link>
  );
}

export function MeusPagamentosPage() {
  const { data, isLoading, isError, refetch } = useMinhasCobrancas();
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const proxima = useMemo(() => proximaCobranca(data ?? []), [data]);

  // Aplica o filtro pelo status derivado (lista já vem ordenada por vencimento desc).
  const lista = useMemo(() => {
    const cobrancas = data ?? [];
    if (filtro === 'todos') return cobrancas;
    return cobrancas.filter((l) => statusDaCobranca(l) === filtro);
  }, [data, filtro]);

  if (isLoading) return <SkeletonPortal />;
  if (isError) return <ErroPortal onRetry={() => refetch()} />;

  const temCobrancas = (data ?? []).length > 0;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Pagamentos</h1>

      {/* Próxima cobrança em destaque */}
      <Secao titulo="Próxima cobrança">
        {proxima ? (
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatMoeda(proxima.valor)}</p>
              <p className="mt-1 text-xs text-neutral-500">Vence em {formatDataSimples(proxima.data_prevista)}</p>
            </div>
            <Pill tom={TOM_STATUS[statusDaCobranca(proxima)]}>{STATUS_COBRANCA_LABEL[statusDaCobranca(proxima)]}</Pill>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Nenhuma cobrança em aberto.</p>
        )}
      </Secao>

      {/* Filtros por situação */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              filtro === f.id
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/20'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de cobranças */}
      {!temCobrancas ? (
        <VazioPortal>Nenhuma cobrança encontrada.</VazioPortal>
      ) : lista.length === 0 ? (
        <VazioPortal>Nenhuma cobrança neste filtro.</VazioPortal>
      ) : (
        <Secao titulo="Cobranças">
          <div className="divide-y divide-neutral-100 dark:divide-white/10">
            {lista.map((l) => (
              <ItemCobranca key={l.id} lancamento={l} />
            ))}
          </div>
        </Secao>
      )}
    </div>
  );
}
