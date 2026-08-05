import { Star } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useFavorito } from '../hooks/useFavorito';

export function FavoritoButton({
  entidadeTipo,
  entidadeId,
  usuarioId,
  empresaId,
}: {
  entidadeTipo: string;
  entidadeId: string;
  usuarioId?: string;
  empresaId?: string;
}) {
  const { favorito, toggle } = useFavorito(entidadeTipo, entidadeId, usuarioId, empresaId);

  return (
    <button
      type="button"
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending || !usuarioId}
      className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-amber-600 dark:text-neutral-400"
      aria-pressed={!!favorito}
    >
      <Star className={cn('h-4 w-4', favorito ? 'fill-amber-500 text-amber-500' : '')} />
      {favorito ? 'Favoritado' : 'Favoritar'}
    </button>
  );
}
