import { useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useCreateMeta } from '../hooks/useMetas';
import { META_UNIDADE_LABEL, type MetaUnidade } from '../types';

export function NovaMetaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: usuario } = useCurrentUsuario();
  const createMeta = useCreateMeta();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState<MetaUnidade>('numero');
  const [valorAlvo, setValorAlvo] = useState('');
  const [valorAtual, setValorAtual] = useState('0');
  const [dataAlvo, setDataAlvo] = useState('');

  function handleClose() {
    setTitulo('');
    setDescricao('');
    setUnidade('numero');
    setValorAlvo('');
    setValorAtual('0');
    setDataAlvo('');
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!usuario?.empresa_id || !titulo.trim() || !valorAlvo) return;
    createMeta.mutate(
      {
        empresaId: usuario.empresa_id,
        criadoPor: usuario.id,
        payload: {
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          unidade,
          valor_alvo: Number(valorAlvo),
          valor_atual: Number(valorAtual) || 0,
          data_alvo: dataAlvo || null,
        },
      },
      {
        onSuccess: () => {
          toast.success('Meta criada');
          handleClose();
        },
      }
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="Nova meta"
      description="O progresso é atualizado manualmente — sem histórico ainda para calcular sozinho de forma confiável."
    >
      <div className="space-y-3">
        <div>
          <Label>Título *</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Chegar a 10 veículos" />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Unidade</Label>
            <Select value={unidade} onChange={(e) => setUnidade(e.target.value as MetaUnidade)}>
              {Object.entries(META_UNIDADE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Data alvo</Label>
            <Input type="date" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Valor alvo *</Label>
            <Input type="number" min={0} step="0.01" value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} />
          </div>
          <div>
            <Label>Valor atual</Label>
            <Input type="number" min={0} step="0.01" value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={handleSubmit} disabled={createMeta.isPending || !titulo.trim() || !valorAlvo}>
            {createMeta.isPending ? 'Salvando…' : 'Criar meta'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
