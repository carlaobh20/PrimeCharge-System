import { useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { toast } from '@/shared/components/ui/toast';
import { useArquivarFunilEtapa, useCriarFunilEtapa } from '../../hooks/useFunilEtapas';
import { FUNIL_ETAPA_GRUPO_LABEL, type FunilEtapa, type FunilEtapaGrupo, type Motorista } from '../../types';

const GRUPOS: FunilEtapaGrupo[] = ['lead', 'em_analise', 'aprovado', 'fila', 'ativo', 'encerrado', 'nenhum'];

// Épico 6, Fase 1.1 — pedido do Carlos testando o Kanban ao vivo: "quero conseguir editar o
// kanban, adicionar ou excluir uma fase". Etapa nova sempre entra no fim da ordem (reordenar
// arrastando colunas fica pra Fase 2 — aqui é só criar/remover, o pedido literal). Excluir é
// sempre soft (ativa=false) e BLOQUEADO enquanto a etapa tiver motorista não-arquivado dentro —
// força mover as pessoas antes, em vez de perder a referência delas.
export function GerenciarFunilDialog({
  open,
  onOpenChange,
  empresaId,
  etapas,
  motoristas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string | undefined;
  etapas: FunilEtapa[];
  motoristas: Motorista[];
}) {
  const [nome, setNome] = useState('');
  const [grupo, setGrupo] = useState<FunilEtapaGrupo>('nenhum');
  const criar = useCriarFunilEtapa();
  const arquivar = useArquivarFunilEtapa();

  const contagemPorEtapa = new Map<string, number>();
  for (const m of motoristas) {
    if (!m.etapa_funil_id) continue;
    contagemPorEtapa.set(m.etapa_funil_id, (contagemPorEtapa.get(m.etapa_funil_id) ?? 0) + 1);
  }

  function handleAdicionar() {
    if (!empresaId || !nome.trim()) return;
    const proximaOrdem = etapas.length > 0 ? Math.max(...etapas.map((e) => e.ordem)) + 1 : 1;
    criar.mutate(
      { empresaId, nome: nome.trim(), grupo, ordem: proximaOrdem },
      {
        onSuccess: () => {
          toast.success(`Etapa "${nome.trim()}" criada`);
          setNome('');
          setGrupo('nenhum');
        },
      }
    );
  }

  function handleExcluir(etapa: FunilEtapa) {
    const count = contagemPorEtapa.get(etapa.id) ?? 0;
    if (count > 0) return;
    arquivar.mutate(etapa.id, { onSuccess: () => toast.success(`Etapa "${etapa.nome}" removida`) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Gerenciar etapas do Kanban" description="Adicione ou remova colunas do funil." className="max-w-lg">
      <div className="space-y-4">
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {etapas.map((etapa) => {
            const count = contagemPorEtapa.get(etapa.id) ?? 0;
            return (
              <div key={etapa.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 dark:border-white/10">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{etapa.nome}</p>
                  <p className="text-xs text-neutral-400">
                    {FUNIL_ETAPA_GRUPO_LABEL[etapa.grupo]} · {count} motorista{count === 1 ? '' : 's'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:text-neutral-300"
                  disabled={count > 0 || arquivar.isPending}
                  title={count > 0 ? 'Mova os motoristas desta etapa antes de excluir' : 'Excluir etapa'}
                  onClick={() => handleExcluir(etapa)}
                >
                  Excluir
                </Button>
              </div>
            );
          })}
          {etapas.length === 0 && <p className="text-sm text-neutral-500">Nenhuma etapa cadastrada ainda.</p>}
        </div>

        <div className="border-t border-neutral-200 pt-4 dark:border-white/10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Nova etapa</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da etapa" className="sm:flex-1" />
            <Select value={grupo} onChange={(e) => setGrupo(e.target.value as FunilEtapaGrupo)} className="sm:w-48">
              {GRUPOS.map((g) => (
                <option key={g} value={g}>
                  {FUNIL_ETAPA_GRUPO_LABEL[g]}
                </option>
              ))}
            </Select>
            <Button type="button" size="sm" disabled={!nome.trim() || criar.isPending} onClick={handleAdicionar}>
              {criar.isPending ? 'Adicionando…' : 'Adicionar'}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            "Grupo" é o que conta nos cartões de métrica do topo (Leads, Em análise, etc). Sem certeza? Deixe "Nenhum" — a coluna funciona
            normalmente, só não soma em nenhum total.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
