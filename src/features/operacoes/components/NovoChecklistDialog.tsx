import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useCreateChecklist } from '../hooks/useChecklists';
import { CHECKLIST_MODELOS } from './checklistModelos';

// Fase 4 da missão "MVP Operacional" (2026-08-06) — API/hooks já existiam desde a Sprint 9
// (DEC-059), sem UI própria. Este é o primeiro consumidor real: escolhe um modelo (entrega,
// devolução, vistoria semanal/extraordinária, troca de motorista, ou personalizado), os itens
// entram editáveis, e o checklist nasce vinculado à entidade que abriu o Dialog (genérico via
// entidade_tipo/entidade_id — mesmo padrão de ComentariosPanel/TimelinePanel).
export function NovoChecklistDialog({
  open,
  onOpenChange,
  entidadeTipo,
  entidadeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entidadeTipo: string;
  entidadeId: string;
}) {
  const { data: usuario } = useCurrentUsuario();
  const createChecklist = useCreateChecklist();

  const [modeloChave, setModeloChave] = useState(CHECKLIST_MODELOS[0].chave);
  const [titulo, setTitulo] = useState(CHECKLIST_MODELOS[0].titulo);
  const [itens, setItens] = useState<string[]>(CHECKLIST_MODELOS[0].itens);
  const [novoItem, setNovoItem] = useState('');

  function handleClose() {
    const primeiro = CHECKLIST_MODELOS[0];
    setModeloChave(primeiro.chave);
    setTitulo(primeiro.titulo);
    setItens(primeiro.itens);
    setNovoItem('');
    onOpenChange(false);
  }

  function handleModeloChange(chave: string) {
    const modelo = CHECKLIST_MODELOS.find((m) => m.chave === chave) ?? CHECKLIST_MODELOS[0];
    setModeloChave(modelo.chave);
    setTitulo(modelo.titulo);
    setItens(modelo.itens);
  }

  function handleAdicionarItem() {
    const texto = novoItem.trim();
    if (!texto) return;
    setItens((atual) => [...atual, texto]);
    setNovoItem('');
  }

  function handleRemoverItem(index: number) {
    setItens((atual) => atual.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!usuario?.empresa_id || !titulo.trim() || itens.length === 0) return;
    createChecklist.mutate(
      {
        empresaId: usuario.empresa_id,
        payload: {
          titulo: titulo.trim(),
          entidade_tipo: entidadeTipo,
          entidade_id: entidadeId,
          responsavel_id: usuario.id,
          itens: itens.map((descricao) => ({ descricao, obrigatorio: true })),
        },
      },
      {
        onSuccess: () => {
          toast.success('Checklist criado');
          handleClose();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} title="Novo checklist" description="Escolha um modelo e ajuste os itens antes de salvar.">
      <div className="space-y-4">
        <div>
          <Label>Modelo</Label>
          <Select value={modeloChave} onChange={(e) => handleModeloChange(e.target.value)}>
            {CHECKLIST_MODELOS.map((modelo) => (
              <option key={modelo.chave} value={modelo.chave}>
                {modelo.titulo}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Título *</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>

        <div>
          <Label>Itens *</Label>
          <div className="mt-1.5 space-y-1.5">
            {itens.length === 0 && <p className="text-xs text-neutral-400">Nenhum item ainda — adicione abaixo.</p>}
            {itens.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-white/10"
              >
                <span className="text-neutral-700 dark:text-neutral-300">{item}</span>
                <button
                  type="button"
                  onClick={() => handleRemoverItem(index)}
                  aria-label={`Remover item "${item}"`}
                  className="shrink-0 text-neutral-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={novoItem}
              onChange={(e) => setNovoItem(e.target.value)}
              placeholder="Adicionar item…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdicionarItem();
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAdicionarItem}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createChecklist.isPending || !titulo.trim() || itens.length === 0}>
            {createChecklist.isPending ? 'Salvando…' : 'Criar checklist'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
