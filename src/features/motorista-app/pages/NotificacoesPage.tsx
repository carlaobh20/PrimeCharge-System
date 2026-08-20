import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Wallet, ShoppingBag, LifeBuoy, FileText, ClipboardCheck, type LucideIcon } from 'lucide-react';
import { formatDataRelativa } from '@/shared/lib/format';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { SkeletonPortal, ErroPortal, VazioPortal } from '../components/ui';
import { useMinhasNotificacoes, useMarcarNotificacaoLida, useMarcarTodasLidas } from '../hooks/useMotoristaApp';
import type { Notificacao, NotificacaoTipo } from '../api/notificacoes';

// Épico 11 — App do Motorista. Central de notificações in-app: o motorista lê, marca como lida e
// (se houver link) pula direto pro item que originou a notificação. Sem push nesta fase.

// Ícone por tipo de notificação.
const ICONE: Record<NotificacaoTipo, LucideIcon> = {
  cobranca: Wallet,
  pedido: ShoppingBag,
  chamado: LifeBuoy,
  documento: FileText,
  vistoria: ClipboardCheck,
  geral: Bell,
};

type Aba = 'todas' | 'nao-lidas';

function ItemNotificacao({ n, onAbrir }: { n: Notificacao; onAbrir: (n: Notificacao) => void }) {
  const Icone = ICONE[n.tipo] ?? Bell;
  return (
    <button
      type="button"
      onClick={() => onAbrir(n)}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
        n.lida ? 'hover:bg-neutral-50 dark:hover:bg-white/5' : 'bg-emerald-50/60 hover:bg-emerald-50 dark:bg-emerald-500/[0.06] dark:hover:bg-emerald-500/10',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          n.lida ? 'bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
        )}
      >
        <Icone className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('truncate text-sm', n.lida ? 'font-medium text-neutral-700 dark:text-neutral-300' : 'font-semibold text-neutral-900 dark:text-neutral-100')}>
            {n.titulo}
          </p>
          {!n.lida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-label="Não lida" />}
        </div>
        {n.mensagem && <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{n.mensagem}</p>}
        <p className="mt-1 text-xs text-neutral-400">{formatDataRelativa(n.criado_em)}</p>
      </div>
    </button>
  );
}

export function NotificacoesPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useMinhasNotificacoes();
  const marcarLida = useMarcarNotificacaoLida();
  const marcarTodas = useMarcarTodasLidas();
  const [aba, setAba] = useState<Aba>('todas');

  const lista = data ?? [];
  const naoLidas = lista.filter((n) => !n.lida);
  const visiveis = aba === 'nao-lidas' ? naoLidas : lista;

  function abrir(n: Notificacao) {
    if (!n.lida) marcarLida.mutate(n.id);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Notificações</h1>
        {naoLidas.length > 0 && (
          <Button variant="outline" size="sm" disabled={marcarTodas.isPending} onClick={() => marcarTodas.mutate()}>
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Abas simples: filtro local, sem trocar de rota. */}
      <div className="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-white/5">
        {(['todas', 'nao-lidas'] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAba(a)}
            className={cn(
              'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              aba === a ? 'bg-white text-neutral-900 shadow-sm dark:bg-white/10 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
            )}
          >
            {a === 'todas' ? 'Todas' : `Não lidas${naoLidas.length ? ` (${naoLidas.length})` : ''}`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonPortal />
      ) : isError ? (
        <ErroPortal onRetry={() => refetch()} />
      ) : visiveis.length === 0 ? (
        <VazioPortal>Você está em dia. Nenhuma notificação.</VazioPortal>
      ) : (
        <div className="space-y-1">
          {visiveis.map((n) => (
            <ItemNotificacao key={n.id} n={n} onAbrir={abrir} />
          ))}
        </div>
      )}
    </div>
  );
}
