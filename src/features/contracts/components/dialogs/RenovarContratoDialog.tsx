import { useState } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';

export function RenovarContratoDialog({
  open,
  onOpenChange,
  dataFimAtual,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataFimAtual: string | null;
  onConfirm: (novaDataFimPrevista: string) => void;
  isPending?: boolean;
}) {
  const [novaData, setNovaData] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Renovar contrato"
      description="Define a nova data de fim prevista e move o contrato de volta para Ativo, passando por Renovação (mesma state machine, sem pular etapa)."
    >
      <div className="space-y-3">
        <div>
          <Label>Data de fim atual</Label>
          <Input type="date" value={dataFimAtual ?? ''} disabled />
        </div>
        <div>
          <Label>Nova data de fim prevista *</Label>
          <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" size="sm" disabled={!novaData || isPending} onClick={() => onConfirm(novaData)}>
          {isPending ? 'Renovando…' : 'Confirmar renovação'}
        </Button>
      </div>
    </Dialog>
  );
}
