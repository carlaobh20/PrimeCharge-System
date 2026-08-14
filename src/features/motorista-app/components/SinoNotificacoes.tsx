import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useMinhasNotificacoes } from '../hooks/useMotoristaApp';

// Sino de notificações do header do app do motorista: leva pra central e mostra a contagem de
// não-lidas num badge. Sem badge quando não há nada pendente. Pequeno, pra caber no header.

export function SinoNotificacoes() {
  const { data } = useMinhasNotificacoes();
  const naoLidas = (data ?? []).filter((n) => !n.lida).length;

  return (
    <Link
      to="/motorista/notificacoes"
      aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : 'Notificações'}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
    >
      <Bell className="h-5 w-5" />
      {naoLidas > 0 && (
        <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
          {naoLidas > 9 ? '9+' : naoLidas}
        </span>
      )}
    </Link>
  );
}
