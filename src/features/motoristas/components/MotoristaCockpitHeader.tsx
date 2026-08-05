import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, MoreHorizontal, Pencil, Plus, User } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { FavoritoButton } from '@/shared/capabilities/components/FavoritoButton';
import { useTags } from '@/shared/capabilities/hooks/useTags';
import { useEmpresaAtual } from '@/shared/hooks/useEmpresaAtual';
import { useCopyPageLink } from '@/shared/hooks/useCopyPageLink';
import { StatusBadge } from './StatusBadge';
import type { Motorista } from '../types';
import type { ActionKey } from '../lib/actions';

function iniciais(nomeCompleto: string) {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export function MotoristaCockpitHeader({
  motorista,
  usuarioId,
  empresaId,
  onAction,
  onExcluir,
}: {
  motorista: Motorista;
  usuarioId?: string;
  empresaId?: string;
  onAction: (key: ActionKey) => void;
  onExcluir: () => void;
}) {
  const { data: empresa } = useEmpresaAtual();
  const { data: tags } = useTags('motorista', motorista.id);
  const { copiado, copiar } = useCopyPageLink();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <header className="animate-cockpit-fade-in overflow-hidden rounded-3xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 text-xl font-semibold text-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-neutral-600">
            {motorista.nome_completo ? iniciais(motorista.nome_completo) : <User className="h-8 w-8" />}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                {motorista.nome_completo}
              </h1>
              <StatusBadge status={motorista.status} />
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {motorista.cpf}
              {motorista.cidade ? ` · ${motorista.cidade}${motorista.estado ? `/${motorista.estado}` : ''}` : ''}
              {empresa?.nome ? ` · ${empresa.nome}` : ''}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {tags?.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.tag}
                </Badge>
              ))}
              <button
                type="button"
                onClick={() => onAction('tag')}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-2.5 py-0.5 text-xs text-neutral-400 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-white/15 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
              >
                <Plus className="h-3 w-3" />
                Tag
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <FavoritoButton entidadeTipo="motorista" entidadeId={motorista.id} usuarioId={usuarioId} empresaId={empresaId} />
          <Link to={`/motoristas/${motorista.id}/editar`}>
            <Button type="button" variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={copiar}>
            {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copiado ? 'Copiado' : 'Compartilhar'}
          </Button>

          <div className="relative">
            <Button type="button" variant="outline" size="icon" onClick={() => setMenuAberto((o) => !o)} aria-label="Mais opções">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {menuAberto && (
              <div className="absolute right-0 z-10 mt-1 w-52 animate-cockpit-scale-in rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-neutral-900">
                <button
                  type="button"
                  onClick={() => {
                    setMenuAberto(false);
                    onExcluir();
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
