import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Check, Copy, MoreHorizontal, Pencil, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { FavoritoButton } from '@/shared/capabilities/components/FavoritoButton';
import { useTags } from '@/shared/capabilities/hooks/useTags';
import { useEmpresaAtual } from '@/shared/hooks/useEmpresaAtual';
import { useVeiculoFotoCapa } from '../hooks/useVeiculoFotoCapa';
import { useCopyPageLink } from '../lib/useCopyPageLink';
import { StatusBadge } from './StatusBadge';
import { VEICULO_CATEGORIA_LABEL } from '../types';
import type { VeiculoComRelacoes } from '../types';
import type { ActionKey } from '../lib/actions';

export function VeiculoCockpitHeader({
  veiculo,
  usuarioId,
  empresaId,
  onAction,
  onExcluir,
}: {
  veiculo: VeiculoComRelacoes;
  usuarioId?: string;
  empresaId?: string;
  onAction: (key: ActionKey) => void;
  onExcluir: () => void;
}) {
  const fotoCapa = useVeiculoFotoCapa(veiculo.id);
  const { data: empresa } = useEmpresaAtual();
  const { data: tags } = useTags('veiculo', veiculo.id);
  const { copiado, copiar } = useCopyPageLink();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <header className="animate-cockpit-fade-in overflow-hidden rounded-3xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 dark:border-white/10 dark:from-neutral-900 dark:to-neutral-950">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-white/10 dark:bg-white/5">
            {fotoCapa ? (
              <img src={fotoCapa} alt={veiculo.placa} className="h-full w-full object-cover" />
            ) : (
              <Car className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                {veiculo.marca?.nome} {veiculo.modelo?.nome}
              </h1>
              <StatusBadge status={veiculo.status} />
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {veiculo.placa} · {veiculo.ano_fabricacao}/{veiculo.ano_modelo} · {VEICULO_CATEGORIA_LABEL[veiculo.categoria]}
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
          <FavoritoButton entidadeTipo="veiculo" entidadeId={veiculo.id} usuarioId={usuarioId} empresaId={empresaId} />
          <Link to={`/veiculos/${veiculo.id}/editar`}>
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
                {[
                  { key: 'duplicar' as ActionKey, label: 'Duplicar veículo' },
                  { key: 'vender' as ActionKey, label: 'Vender veículo' },
                  { key: 'arquivar' as ActionKey, label: 'Arquivar' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onAction(item.key);
                      setMenuAberto(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="my-1 border-t border-neutral-100 dark:border-white/10" />
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
