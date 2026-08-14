import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { useVistoriaComComparacao } from '../hooks/useChecklists';
import { getUrlAssinada } from '../api/checklists';

// Épico 8, ETAPA 5 — a parte mais importante do épico segundo o brief: mostrar lado a lado o
// que mudou entre a entrega e a devolução. Usa `checklist_anterior_id` (setado na criação da
// devolução, ver ContratoDetailPage/VistoriaDialog) pra parear as duas vistorias corretamente
// mesmo em contratos com mais de um ciclo entrega/devolução.
function FotoAssinada({ caminho, alt }: { caminho: string | null; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!caminho) return;
    getUrlAssinada(caminho).then(setUrl).catch(() => setUrl(null));
  }, [caminho]);
  if (!caminho) return <p className="text-xs text-neutral-400">—</p>;
  if (!url) return <div className="h-16 w-32 cockpit-shimmer rounded-md" />;
  return <img src={url} alt={alt} className="h-16 rounded-md object-contain" />;
}

export function VistoriaComparacaoDialog({
  open,
  onOpenChange,
  devolucaoId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devolucaoId: string | null;
}) {
  const { data, isLoading } = useVistoriaComComparacao(devolucaoId ?? undefined);
  const atual = data?.atual;
  const anterior = data?.anterior;

  const kmRodados = atual?.odometro_km != null && anterior?.odometro_km != null ? atual.odometro_km - anterior.odometro_km : null;
  const deltaCarga = atual?.carga_pct != null && anterior?.carga_pct != null ? atual.carga_pct - anterior.carga_pct : null;

  const itensAlterados = (atual?.itens ?? []).filter((itemDevolucao) => {
    const itemEntrega = anterior?.itens.find((i) => i.descricao === itemDevolucao.descricao);
    if (!itemEntrega) return false;
    return itemEntrega.resposta !== itemDevolucao.resposta || itemEntrega.aplicavel !== itemDevolucao.aplicavel;
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Entrega × Devolução"
      description="Comparação real entre as duas vistorias deste contrato."
      className="max-w-2xl max-h-[88vh] overflow-y-auto"
    >
      {isLoading && <div className="h-40 cockpit-shimmer rounded-2xl" />}

      {!isLoading && !anterior && (
        <p className="text-sm text-neutral-500">Esta devolução não está ligada a uma vistoria de entrega concluída — sem base pra comparar.</p>
      )}

      {atual && anterior && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-neutral-100 p-3 dark:border-white/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Quilometragem</p>
              <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                {anterior.odometro_km ?? '—'} km <ArrowRight className="inline h-3 w-3" /> {atual.odometro_km ?? '—'} km
              </p>
              {kmRodados !== null && <p className="mt-0.5 text-xs text-neutral-500">{kmRodados} km rodados</p>}
            </div>
            <div className="rounded-xl border border-neutral-100 p-3 dark:border-white/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Carga da bateria</p>
              <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
                {anterior.carga_pct ?? '—'}% <ArrowRight className="inline h-3 w-3" /> {atual.carga_pct ?? '—'}%
              </p>
              {deltaCarga !== null && (
                <p className={`mt-0.5 text-xs ${deltaCarga < 0 ? 'text-amber-600' : 'text-neutral-500'}`}>
                  {deltaCarga > 0 ? '+' : ''}
                  {deltaCarga} pontos
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Itens do checklist {itensAlterados.length > 0 ? `— ${itensAlterados.length} alterado(s)` : '— nenhum alterado'}
            </p>
            <div className="space-y-2">
              {(atual.itens ?? []).map((itemDevolucao) => {
                const itemEntrega = anterior.itens.find((i) => i.descricao === itemDevolucao.descricao);
                const alterou = itemEntrega && (itemEntrega.resposta !== itemDevolucao.resposta || itemEntrega.aplicavel !== itemDevolucao.aplicavel);
                const novaAvaria = itemDevolucao.aplicavel && itemDevolucao.resposta === false;
                return (
                  <div
                    key={itemDevolucao.id}
                    className={`rounded-lg border p-2.5 text-sm ${alterou ? 'border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/10' : 'border-neutral-100 dark:border-white/5'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-800 dark:text-neutral-200">{itemDevolucao.descricao}</span>
                      {novaAvaria && (
                        <Badge variant="destructive">
                          <AlertTriangle className="mr-1 h-3 w-3 inline" /> Avaria
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      Entrega: {itemEntrega ? (!itemEntrega.aplicavel ? 'Não se aplica' : itemEntrega.resposta === false ? 'Não OK' : itemEntrega.resposta === true ? 'OK' : 'Sem resposta') : '—'}
                      {' · '}
                      Devolução: {!itemDevolucao.aplicavel ? 'Não se aplica' : itemDevolucao.resposta === false ? 'Não OK' : itemDevolucao.resposta === true ? 'OK' : 'Sem resposta'}
                    </p>
                    {itemDevolucao.observacao && <p className="mt-0.5 text-xs text-neutral-500">Obs.: {itemDevolucao.observacao}</p>}
                    {novaAvaria && itemDevolucao.foto_url && (
                      <div className="mt-2">
                        <FotoAssinada caminho={itemDevolucao.foto_url} alt={`Avaria em ${itemDevolucao.descricao}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Assinatura na entrega</p>
              <FotoAssinada caminho={anterior.assinatura_url} alt="Assinatura na entrega" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Assinatura na devolução</p>
              <FotoAssinada caminho={atual.assinatura_url} alt="Assinatura na devolução" />
            </div>
          </div>

          {atual.observacoes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Observações da devolução</p>
              <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{atual.observacoes}</p>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
